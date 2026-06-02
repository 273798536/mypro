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
        xuanzhi: "#f5f0e8",
        mohei: "#1a1a2e",
        gutong: "#c9a96e",
        zhusha: "#c0392b",
        dianlan: "#2c3e7a",
        "gutong-light": "#e8d5b0",
        "mohei-light": "#2d2d4a",
      },
      fontFamily: {
        serif: ["Noto Serif SC", "serif"],
        heading: ["Ma Shan Zheng", "cursive"],
      },
      boxShadow: {
        warm: "0 4px 6px -1px rgba(26, 26, 46, 0.08), 0 2px 4px -2px rgba(201, 169, 110, 0.1)",
        "warm-md": "0 6px 12px -2px rgba(26, 26, 46, 0.1), 0 4px 8px -2px rgba(201, 169, 110, 0.12)",
        "warm-lg": "0 10px 20px -4px rgba(26, 26, 46, 0.12), 0 6px 12px -4px rgba(201, 169, 110, 0.14)",
      },
    },
  },
  plugins: [],
};
