import React, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { FaCopy, FaSync } from "react-icons/fa";

const Main = () => {
  const [finalRaydiumTokens, setFinalRaydiumTokens] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [selectedToken, setSelectedToken] = useState(null);
  const [isRiskModalOpen, setIsRiskModalOpen] = useState(false);
  const [selectedRiskToken, setSelectedRiskToken] = useState(null);
  const [isChartModalOpen, setIsChartModalOpen] = useState(false);
  const [selectedChartToken, setSelectedChartToken] = useState(null);
  const [loadingMetadata, setLoadingMetadata] = useState({});

  useEffect(() => {
    const socket = io("https://app.decentralizedfinds.com", {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("Connected to Socket.IO server");
      setIsConnected(true);
      setConnectionError(null);
    });

    socket.on("newRaydiumTokens", (tokens) => {
      console.log("Received Raydium tokens from server:", tokens);
      setFinalRaydiumTokens(tokens);
      if (tokens.length > 0 && !selectedToken) {
        setSelectedToken(tokens[0]);
      }
    });

    socket.on("connect_error", (err) => {
      console.error("Connection error:", err);
      setIsConnected(false);
      setConnectionError(err.message);
    });

    return () => socket.disconnect();
  }, [selectedToken]);

  const truncateMintAddress = (address) => {
    if (!address || address.length < 9) return address;
    return `${address.slice(0, 5)}...${address.slice(-4)}`;
  };

  const copyToClipboard = (text) => {
    navigator.clipboard
      .writeText(text)
      .then(() => alert("Mint address copied to clipboard!"))
      .catch((err) => console.error("Failed to copy address: ", err));
  };

  const getRiskBackground = (risks) => {
    if (!risks || risks.length === 0) return "bg-green-500";
    const hasDanger = risks.some((risk) => risk.level === "danger");
    const hasWarn = risks.some((risk) => risk.level === "warn");
    return hasDanger
      ? "bg-red-500"
      : hasWarn
      ? "bg-yellow-500"
      : "bg-green-500";
  };

  const openRiskModal = (token) => {
    setSelectedRiskToken(token);
    setIsRiskModalOpen(true);
  };

  const closeRiskModal = () => {
    setIsRiskModalOpen(false);
    setSelectedRiskToken(null);
  };

  const openChartModal = (token) => {
    setSelectedChartToken(token);
    setIsChartModalOpen(true);
  };

  const closeChartModal = () => {
    setIsChartModalOpen(false);
    setSelectedChartToken(null);
  };

  const refreshMetadata = (mint) => {
    setLoadingMetadata((prev) => ({ ...prev, [mint]: true }));
    setTimeout(() => {
      setLoadingMetadata((prev) => ({ ...prev, [mint]: false }));
      console.log(`Retrying metadata fetch for mint: ${mint}`);
    }, 1000);
  };

  const handleTokenSelect = (token) => {
    setSelectedToken(token);
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <div className="w-full md:w-4/5 mx-auto py-2 md:py-4 px-4 flex flex-col lg:flex-row gap-4">
        {/* Left Column: Token List */}
        <div className="flex-1">
          <div className="flex justify-center text-3xl py-2 orbitron border-b border-gray-600 uppercase font-bold">
            New Raydium Liquidity Pool Tokens
          </div>
          <div className="flex justify-center text-3xl orbitron font-bold mt-4">
            <span>LEGEND</span>
          </div>
          <div className="my-5 flex justify-evenly">
            <div className="">
              <span className="orbitron">GOOD</span>
              <div className="h-12 w-12 ml-1 flex bg-green-500 rounded-full"></div>
            </div>
            <div>
              <span className="orbitron">WARNING</span>
              <div className="h-12 ml-5 w-12 bg-yellow-500 rounded-full"></div>
            </div>
            <div>
              <span className="orbitron">DANGER</span>
              <div className="h-12  ml-4 w-12 bg-red-500 rounded-full"></div>
            </div>
          </div>

          {finalRaydiumTokens
            .filter(
              (token) =>
                token.mint !== "So11111111111111111111111111111111111111112"
            )
            .map((token) => (
              <div
                key={token.mint}
                className={`flex flex-col md:flex-col lg:flex-col xl:flex-row py-2 my-2 md:py-3 md:my-4 border-b orbitron rounded-xl shadow-2xl uppercase tracking-wide border-gray-700 gap-2 md:gap-4 cursor-pointer ${getRiskBackground(
                  token.risks
                )}`}
                onClick={() => handleTokenSelect(token)}
              >
                <div className="flex flex-row  lg:flex-row items-start md:items-center justify-between space-x-4 md:space-x-0 md:space-y-4 lg:space-x-4 lg:space-y-0 p-2 flex-1">
                  <div className="flex flex-row items-center space-x-4">
                    {loadingMetadata[token.mint] ? (
                      <div className="w-12 h-12 md:w-24 md:h-24 flex items-center justify-center">
                        <span className="text-gray-500">Loading...</span>
                      </div>
                    ) : (
                      <img
                        src={token.image || "default-logo.png"}
                        alt="Token Logo"
                        className="w-12 h-12 md:w-24 md:h-24 rounded-full"
                        onError={(e) => (e.target.src = "default-logo.png")}
                      />
                    )}
                    <div className="flex flex-col">
                      <span className="font-semibold text-base md:text-lg">
                        {loadingMetadata[token.mint]
                          ? "Loading..."
                          : token.name}
                      </span>
                      <span className="text-sm md:text-md text-black">
                        Symbol:{" "}
                        {loadingMetadata[token.mint]
                          ? "Loading..."
                          : token.symbol}
                      </span>
                      <span className="text-sm md:text-md text-black flex items-center">
                        Mint: {truncateMintAddress(token.mint)}
                        <FaCopy
                          className="ml-2 cursor-pointer hover:text-gray-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(token.mint);
                          }}
                        />
                        <FaSync
                          className="ml-2 cursor-pointer hover:text-gray-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            refreshMetadata(token.mint);
                          }}
                          title="Retry metadata fetch"
                        />
                      </span>
                      <span className="text-sm md:text-md text-black">
                        Created: {token.creationTime}
                      </span>
                      {token.liquidity !== null && (
                        <span className="text-sm md:text-md text-black">
                          Liquidity (USD): {token.liquidity.toLocaleString()}
                        </span>
                      )}
                      {token.lpLockedPct && token.lpLockedPct !== "N/A" && (
                        <span className="text-sm md:text-md text-black">
                          LP Locked:{" "}
                          {token.lpLockedPct < 0.001
                            ? "<0.001%"
                            : `${Number(token.lpLockedPct).toFixed(2)}%`}
                        </span>
                      )}
                      {token.dextoolsData && (
                        <>
                          <span className="text-sm md:text-md text-black">
                            Total Supply:{" "}
                            {token.dextoolsData.totalSupply?.toLocaleString() ||
                              "N/A"}
                          </span>
                          <span className="text-sm md:text-md text-black">
                            Holders:{" "}
                            {token.dextoolsData.holders?.toLocaleString() ||
                              "N/A"}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div className="flex flex-col lg:flex-row gap-2 sm:mt-10">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openRiskModal(token);
                      }}
                      className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 w-full lg:w-auto"
                    >
                      Risk Info
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openChartModal(token);
                      }}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full lg:w-auto"
                    >
                      Open Chart
                    </button>
                  </div>
                </div>
                <div className="flex justify-center xl:mx-5 my-2">
                  {selectedToken ? (
                    <iframe
                      id="dextools-widget"
                      title={`Mini Chart for ${selectedToken.name}`}
                      width="100%"
                      height="auto"
                      src={`https://www.dextools.io/widget-chart/en/solana/pe-light/${
                        selectedToken.poolAddress || selectedToken.mint
                      }?theme=dark&chartType=10&chartResolution=5&drawingToolbars=false`}
                      className="w-[500px] h-[50px] sm:h-[200px] lg:h-[200px]"
                    ></iframe>
                  ) : (
                    <div className="flex items-center justify-center h-[300px] sm:h-[400px] lg:h-[600px] text-gray-400">
                      Select a token to view its chart
                    </div>
                  )}
                </div>
              </div>
            ))}

          {!isConnected && (
            <div className="text-center py-4 text-red-400">
              Unable to connect to the server. Please check the Socket.IO server
              at https://app.decentralizedfinds.com. Error:{" "}
              {connectionError || "Unknown"}
            </div>
          )}
          {isConnected && finalRaydiumTokens.length === 0 && (
            <div className="text-center py-4 text-gray-400">
              No minted tokens with Raydium liquidity detected yet.
            </div>
          )}
        </div>
      </div>

      {/* Risk Info Modal */}
      {isRiskModalOpen && selectedRiskToken && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-4 rounded shadow-lg w-full max-w-md sm:max-w-lg md:max-w-3xl">
            <div className="flex justify-end">
              <button
                onClick={closeRiskModal}
                className="text-white hover:text-gray-300"
              >
                [CLOSE X]
              </button>
            </div>
            <div className="text-white">
              <h2 className="text-lg font-bold mb-2">
                Risk Information for {selectedRiskToken.name}
              </h2>
              {selectedRiskToken.risks && selectedRiskToken.risks.length > 0 ? (
                selectedRiskToken.risks.map((risk, index) => (
                  <div key={index} className="mb-2">
                    <span
                      className={`font-bold ${
                        risk.level === "danger"
                          ? "text-red-500"
                          : risk.level === "warn"
                          ? "text-yellow-500"
                          : "text-green-500"
                      }`}
                    >
                      {risk.name}
                    </span>
                    <span> ({risk.level})</span>
                  </div>
                ))
              ) : (
                <span>No Risks Detected</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chart Modal */}
      {isChartModalOpen && selectedChartToken && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-4 rounded shadow-lg w-full max-w-4xl">
            <div className="flex justify-end">
              <button
                onClick={closeChartModal}
                className="text-white hover:text-gray-300"
              >
                [CLOSE X]
              </button>
            </div>
            <iframe
              id="dextools-widget"
              title={`Chart for ${selectedChartToken.name}`}
              width="100%"
              height="auto"
              src={`https://www.dextools.io/widget-chart/en/solana/pe-light/${
                selectedChartToken.poolAddress || selectedChartToken.mint
              }?theme=dark&chartType=1&chartResolution=5&drawingToolbars=false`}
              className="w-full h-[400px] sm:h-[500px] lg:h-[700px]"
            ></iframe>
          </div>
        </div>
      )}
    </div>
  );
};

export default Main;
