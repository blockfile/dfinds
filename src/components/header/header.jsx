import React, { useState, useEffect } from "react";
import logo from "../assets/images/logo.png"; // Import the logo as specified
import { FaTelegram } from "react-icons/fa";
import { FaGlobe } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
function Header() {
  const [offset, setOffset] = useState(0);
  const colors = [
    "#ef4444",
    "#f97316",
    "#eab308",
    "#22c55e",
    "#3b82f6",
    "#6366f1",
    "#a855f7",
  ];
  useEffect(() => {
    const interval = setInterval(() => {
      setOffset((prev) => prev + 1);
    }, 3000);
    return () => clearInterval(interval);
  }, []);
  return (
    <header className="w-full mx-auto bg-gray-800 text-white rounded-b-xl shadow-md">
      <div className="flex justify-between items-center p-4">
        {/* Left Section: Logo and Text */}
        <div className="flex items-center space-x-4">
          <img src={logo} alt="Logo" className="w-10 h-10" />
          <div className="flex justify-center py-2 orbitron  uppercase tracking-wider font-bold text-3xl whitespace-nowrap">
            {"DEcentralized FInds".split(" ").map((word, index, array) => (
              <React.Fragment key={index}>
                <span
                  style={{
                    color: colors[(index + offset) % colors.length],
                    transition: "color 0.5s ease-in-out",
                  }}
                >
                  {word}
                </span>
                {index < array.length - 1 && " "}
              </React.Fragment>
            ))}
          </div>
        </div>
        {/* Right Section: Icons */}
        <div className="flex space-x-4">
          {/* X Icon (Twitter) */}
          <a href="#" className="text-white hover:text-gray-300">
            <FaXTwitter size={25} />
            {/* Replace with actual icon */}
          </a>
          {/* Website Icon */}
          <a href="#" className="text-white hover:text-gray-300">
            <FaGlobe size={25} />
            {/* Replace with actual icon */}
          </a>
          {/* Telegram Icon */}
          <a href="#" className="text-white hover:text-gray-300">
            <FaTelegram size={25} /> {/* Replace with actual icon */}
          </a>
        </div>
      </div>
    </header>
  );
}

export default Header;
