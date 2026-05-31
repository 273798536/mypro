/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        display: ["Orbitron", "monospace"],
        sans: ["Noto Sans SC", "sans-serif"],
      },
      colors: {
        track: {
          bg: "#1a1d2e",
          amber: "#f0a830",
          cyan: "#3dc1d3",
          green: "#2ed573",
          red: "#e74c3c",
        },
      },
    },
  },
  plugins: [],
};
