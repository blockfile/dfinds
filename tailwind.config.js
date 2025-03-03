/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        play: ['"Play"', "serif"],
      },
      screens: {
        sm: "320px", // Small devices, now set to 320px
        md: "768px", // Tablets
        lg: "1024px", // Smaller laptops
        xl: "1280px", // Desktops
        "2xl": "1536px", // Large screens
      },
    },
  },
  plugins: [
    function ({ addComponents }) {
      addComponents({
        ".play-regular": {
          fontFamily: '"Play", serif',
          fontWeight: "400",
          fontStyle: "normal",
        },
        ".play-bold": {
          fontFamily: '"Play", serif',
          fontWeight: "700",
          fontStyle: "normal",
        },
        ".silkscreen-regular": {
          fontFamily: '"Silkscreen", serif',
          fontWeight: "400",
          fontStyle: "normal",
        },

        ".silkscreen-bold": {
          fontFamily: '"Silkscreen", serif',
          fontWeight: "700",
          fontStyle: "normal",
        },
        ".geo-regular": {
          fontFamily: '"Geo", serif',
          fontWeight: "400",
          fontStyle: "normal",
        },

        ".geo-regular-italic": {
          fontFamily: '"Geo", serif',
          fontWeight: "400",
          fontStyle: "italic",
        },
        ".orbitron": {
          fontFamily: '"Orbitron", sans-serif',

          fontStyle: "normal",
        },
      });
    },
  ],
};
