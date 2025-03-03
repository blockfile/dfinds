import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import { Connection, PublicKey } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";
import axios from "axios";

// Configuration
const HTTP_ENDPOINT =
  "https://side-old-telescope.solana-mainnet.quiknode.pro/a9e0d1c4f676b80608c48a35abfd719fa6f12b10/";
const WS_ENDPOINT =
  "wss://side-old-telescope.solana-mainnet.quiknode.pro/a9e0d1c4f676b80608c48a35abfd719fa6f12b10/";
const RAYDIUM_PROGRAM_ID = new PublicKey(
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8"
);
const DEXTOOLS_API_KEY = "Mnf3uq5ivJ7PwdN907zdc3iQlPiWwJrR1opN6qrV";
const BURN_ADDRESS = "11111111111111111111111111111111";
const SOLSCAN_API = "https://api.solscan.io/v2/token/meta";

// Express setup (port 3001)
// const app = express();
// app.use(cors({ origin: "http://localhost:3000" }));
// const backendServer = createServer(app);
// const backendPort = 3001;
const app = express();
app.use(cors({ origin: "https://app.decentralizedfinds.com" }));
const backendServer = createServer(app);
const backendPort = 3001;

// Socket.IO setup (port 3002)
// const socketServer = createServer();
// const io = new SocketIOServer(socketServer, {
//   cors: { origin: "http://localhost:3000" },
// });
// const socketPort = 3002;

const socketServer = createServer();
const io = new SocketIOServer(socketServer, {
  cors: { origin: "https://app.decentralizedfinds.com" },
});
const socketPort = 3002;

// Solana connection
const connection = new Connection(HTTP_ENDPOINT, {
  commitment: "confirmed",
  wsEndpoint: WS_ENDPOINT,
});

// Metaplex for token metadata
const metaplex = Metaplex.make(connection);

// Store token data and cached metadata
let tokensData = {};
const metadataCache = new Map();

// Metadata refetch tracking
const lastMetadataRefetch = {};
const metadataRefetchAttempts = {};
const MAX_METADATA_ATTEMPTS = 5;
const METADATA_REFETCH_INTERVAL = 30000;

// Fetch token metadata with enhanced fallback mechanism
async function fetchTokenMetadata(mintAddr) {
  try {
    new PublicKey(mintAddr);
    if (metadataCache.has(mintAddr)) {
      console.log(`Using cached metadata for ${mintAddr}`);
      return metadataCache.get(mintAddr);
    }

    const mint = new PublicKey(mintAddr);
    const metadata = await metaplex.nfts().findByMint({ mintAddress: mint });
    let result = {
      name: metadata.name || "Unknown",
      symbol: metadata.symbol || "Unknown",
      uri: metadata.uri || "",
      image: "",
    };

    if (metadata.uri) {
      try {
        const response = await axios.get(metadata.uri, { timeout: 10000 });
        const jsonMetadata = response.data;
        result = {
          name: jsonMetadata.name || result.name,
          symbol: jsonMetadata.symbol || result.symbol,
          uri: metadata.uri,
          image: jsonMetadata.image || jsonMetadata.imageUrl || "",
        };
      } catch (uriError) {
        console.error(
          `Error fetching URI for ${mintAddr}: ${uriError.message}`
        );
        if (uriError.response) {
          console.error(
            `Status: ${uriError.response.status}, Data: ${uriError.response.data}`
          );
        }
      }
    }

    if (!result.image) {
      try {
        const solscanResponse = await axios.get(
          `${SOLSCAN_API}?token_address=${mintAddr}`,
          { headers: { accept: "application/json" }, timeout: 10000 }
        );
        if (solscanResponse.status === 200 && solscanResponse.data.data) {
          result.image = solscanResponse.data.data.image || "";
        }
      } catch (solscanError) {
        console.error(
          `Solscan metadata error for ${mintAddr}: ${solscanError.message}`
        );
      }
    }

    if (result.name !== "Unknown" && result.symbol !== "Unknown") {
      metadataCache.set(mintAddr, result);
    }
    return result;
  } catch (e) {
    console.error(`Metadata error for ${mintAddr}: ${e.message}`);
    return { name: "Unknown", symbol: "Unknown", uri: "", image: "" };
  }
}

// Fetch additional token info from Dextools API
async function fetchDextoolsData(mintAddr) {
  const url = `https://public-api.dextools.io/trial/v2/token/solana/${mintAddr}/info`;
  try {
    const response = await axios.get(url, {
      headers: { accept: "application/json", "x-api-key": DEXTOOLS_API_KEY },
      timeout: 5000,
    });
    return response.status === 200 && response.data.data
      ? response.data.data
      : null;
  } catch (e) {
    console.error(`Dextools API error for ${mintAddr}: ${e.message}`);
    return null;
  }
}

// Fetch pool liquidity data from Dextools API
async function fetchPoolLiquidity(poolAddress) {
  const url = `https://public-api.dextools.io/trial/v2/pool/solana/${poolAddress}/liquidity`;
  try {
    const response = await axios.get(url, {
      headers: { accept: "application/json", "x-api-key": DEXTOOLS_API_KEY },
      timeout: 5000,
    });
    return response.status === 200 && response.data.data
      ? response.data.data.liquidity
      : null;
  } catch (e) {
    console.error(`Dextools pool API error for ${poolAddress}: ${e.message}`);
    return null;
  }
}

// Check if liquidity is burned
async function checkLiquidityBurned(poolAddress, lpMintAddress) {
  try {
    const largestAccounts = await connection.getTokenLargestAccounts(
      new PublicKey(lpMintAddress)
    );
    const largestAccount = largestAccounts.value[0];
    if (largestAccount && largestAccount.address.toBase58() === BURN_ADDRESS) {
      const supply = await connection.getTokenSupply(
        new PublicKey(lpMintAddress)
      );
      const burnedPercentage =
        (parseFloat(largestAccount.uiAmount) /
          parseFloat(supply.value.uiAmount)) *
        100;
      return burnedPercentage.toFixed(2) + "%";
    }
    return "0%";
  } catch (e) {
    console.error(
      `Error checking liquidity burn for ${poolAddress}: ${e.message}`
    );
    return "0%";
  }
}

// Fetch RugCheck report for LP lock data and additional metadata
async function fetchRugCheckReport(mintAddr) {
  const url = `https://api.rugcheck.xyz/v1/tokens/${mintAddr}/report`;
  try {
    const response = await axios.get(url, { timeout: 5000 });
    return response.status === 200 && response.data ? response.data : null;
  } catch (e) {
    console.error(`RugCheck API error for ${mintAddr}: ${e.message}`);
    return null;
  }
}

// Utility functions
const isMetadataUnknown = (metadata) =>
  !metadata || metadata.name === "Unknown" || metadata.symbol === "Unknown";
const isDextoolsDataIncomplete = (dextoolsData) =>
  !dextoolsData ||
  Object.values(dextoolsData).some(
    (val) => val === "N/A" || val === null || val === undefined
  );
const isLiquidityMissing = (liquidity) =>
  liquidity === undefined || liquidity === null;
const isBurnStatusMissing = (burnStatus) =>
  burnStatus === undefined || burnStatus === null;

// Get tokens with Raydium liquidity, sorted by creationTime descending
function getRaydiumTokens() {
  return Object.keys(tokensData)
    .filter((mintAddr) => tokensData[mintAddr].hasRaydiumLiquidity)
    .map((mintAddr) => {
      const token = tokensData[mintAddr];
      const metadata = token.metadata || {};
      const rugCheckReport = token.rugCheckReport || {};
      const tokenMeta = rugCheckReport.tokenMeta || {};

      // Fallback logic for metadata using RugCheck
      const name =
        metadata.name && metadata.name !== "Unknown"
          ? metadata.name
          : tokenMeta.name || "Unknown";
      const symbol =
        metadata.symbol && metadata.symbol !== "Unknown"
          ? metadata.symbol
          : tokenMeta.symbol || "Unknown";
      const uri = metadata.uri || tokenMeta.uri || "";
      const image = metadata.image || tokenMeta.image || "";

      const markets = rugCheckReport.markets || [];
      const lpLockedPct =
        markets.length > 0 ? markets[0].lp.lpLockedPct : "N/A";

      return {
        mint: mintAddr,
        symbol,
        name,
        uri,
        image,
        creationTime: token.creationTime || "Unknown",
        dextoolsData: token.dextoolsData || {},
        liquidity: token.liquidity || null,
        liquidityBurned: token.liquidityBurned || "0%",
        lpLockedPct,
        poolAddress: token.poolAddress,
        risks: rugCheckReport.risks || [],
      };
    })
    .sort((a, b) => new Date(b.creationTime) - new Date(a.creationTime));
}

// Broadcast token data to clients
function broadcastRaydiumTokens() {
  const filtered = getRaydiumTokens();
  console.log("Broadcasting Raydium tokens:", filtered);
  io.emit("newRaydiumTokens", filtered);
}

// Monitor Raydium logs
connection.onLogs(
  RAYDIUM_PROGRAM_ID,
  async (logInfo) => {
    const { logs, err, signature } = logInfo;
    if (err) return;

    if (logs && logs.some((log) => log.toLowerCase().includes("initialize2"))) {
      console.log(`\n=== New Liquidity Pool Detected ===`);
      console.log(`Tx: https://explorer.solana.com/tx/${signature}`);

      try {
        const tx = await connection.getParsedTransaction(signature, {
          maxSupportedTransactionVersion: 0,
          commitment: "confirmed",
        });
        const accounts =
          tx?.transaction.message.instructions.find(
            (ix) => ix.programId.toBase58() === RAYDIUM_PROGRAM_ID.toBase58()
          )?.accounts || [];

        const poolAddress = accounts[4]?.toBase58();
        const lpMintAddress = accounts[7]?.toBase58();
        const tokenAIndex = 8;
        const tokenBIndex = 9;
        const tokenAAccount = accounts[tokenAIndex]?.toBase58();
        const tokenBAccount = accounts[tokenBIndex]?.toBase58();

        if (poolAddress && lpMintAddress && tokenAAccount && tokenBAccount) {
          const liquidity = await fetchPoolLiquidity(poolAddress);
          const liquidityBurned = await checkLiquidityBurned(
            poolAddress,
            lpMintAddress
          );

          for (const mintAddr of [tokenAAccount, tokenBAccount]) {
            tokensData[mintAddr] = tokensData[mintAddr] || {};
            tokensData[mintAddr].hasRaydiumLiquidity = true;
            tokensData[mintAddr].creationTime = new Date().toLocaleString();
            tokensData[mintAddr].poolAddress = poolAddress;
            tokensData[mintAddr].lpMintAddress = lpMintAddress;
            tokensData[mintAddr].liquidity = liquidity;
            tokensData[mintAddr].liquidityBurned = liquidityBurned;

            if (isMetadataUnknown(tokensData[mintAddr].metadata)) {
              tokensData[mintAddr].metadata = await fetchTokenMetadata(
                mintAddr
              );
            }
            if (isDextoolsDataIncomplete(tokensData[mintAddr].dextoolsData)) {
              tokensData[mintAddr].dextoolsData = await fetchDextoolsData(
                mintAddr
              );
            }
            tokensData[mintAddr].rugCheckReport = await fetchRugCheckReport(
              mintAddr
            );
          }
          broadcastRaydiumTokens();
        }
      } catch (err) {
        console.error(`Failed to parse tx: ${signature} - ${err.message}`);
      }
    }
  },
  "confirmed"
);

// Metadata refetching with backoff and retry limits
setInterval(async () => {
  const mintAddresses = Object.keys(tokensData);
  const now = Date.now();
  for (const mintAddr of mintAddresses) {
    const token = tokensData[mintAddr];
    if (isMetadataUnknown(token.metadata)) {
      metadataRefetchAttempts[mintAddr] =
        metadataRefetchAttempts[mintAddr] || 0;
      if (
        (!lastMetadataRefetch[mintAddr] ||
          now - lastMetadataRefetch[mintAddr] >= METADATA_REFETCH_INTERVAL) &&
        metadataRefetchAttempts[mintAddr] < MAX_METADATA_ATTEMPTS
      ) {
        lastMetadataRefetch[mintAddr] = now;
        metadataRefetchAttempts[mintAddr]++;
        const metadata = await fetchTokenMetadata(mintAddr);
        if (
          metadata &&
          metadata.name !== "Unknown" &&
          metadata.symbol !== "Unknown"
        ) {
          token.metadata = metadata;
          metadataRefetchAttempts[mintAddr] = MAX_METADATA_ATTEMPTS;
        }
      }
    }
  }
  broadcastRaydiumTokens();
}, METADATA_REFETCH_INTERVAL);

// Periodically refetch Dextools data, liquidity, burn status, and RugCheck data
setInterval(async () => {
  const mintAddresses = Object.keys(tokensData);
  for (const mintAddr of mintAddresses) {
    const token = tokensData[mintAddr];
    if (isDextoolsDataIncomplete(token.dextoolsData)) {
      token.dextoolsData = await fetchDextoolsData(mintAddr);
    }
    if (isLiquidityMissing(token.liquidity) && token.poolAddress) {
      token.liquidity = await fetchPoolLiquidity(token.poolAddress);
    }
    if (isBurnStatusMissing(token.liquidityBurned) && token.lpMintAddress) {
      token.liquidityBurned = await checkLiquidityBurned(
        token.poolAddress,
        token.lpMintAddress
      );
    }
    if (!token.rugCheckReport) {
      token.rugCheckReport = await fetchRugCheckReport(mintAddr);
    }
  }
  broadcastRaydiumTokens();
}, 5000);

// Start servers
backendServer.listen(backendPort, () => {
  console.log(`Backend API running on port ${backendPort}`);
});

socketServer.listen(socketPort, () => {
  console.log(`Socket.IO server running on port ${socketPort}`);
  console.log("Listening for Raydium logs...");
});
