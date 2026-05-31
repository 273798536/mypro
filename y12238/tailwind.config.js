/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        port: {
          blue: "#0F3460",
          red: "#E94560",
          green: "#21BF73",
          yellow: "#FFB703",
          dark: "#1A1A2E",
          light: "#F8F9FA",
          steel: "#4A5568",
        },
      },
      fontFamily: {
        sans: ["Noto Sans SC", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
