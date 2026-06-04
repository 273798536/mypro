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
        ink: {
          DEFAULT: "#1a2f23",
          light: "#2a4a3a",
          dark: "#0f1d17",
        },
        amber: {
          DEFAULT: "#d4a847",
          light: "#e4c06a",
          dark: "#b08930",
        },
        slate: {
          custom: "#4a5568",
        },
        ivory: {
          DEFAULT: "#faf8f0",
          dark: "#f0ede0",
        },
        terracotta: {
          DEFAULT: "#c4533a",
          light: "#d47060",
          dark: "#a0402c",
        },
        moss: {
          DEFAULT: "#5a8a6e",
          light: "#6fa882",
          dark: "#487058",
        },
      },
      fontFamily: {
        serif: ["Noto Serif SC", "serif"],
        sans: ["Noto Sans SC", "sans-serif"],
      },
      boxShadow: {
        emboss: "0 2px 0 0 rgba(0,0,0,0.15), 0 1px 3px rgba(0,0,0,0.1)",
        "emboss-hover": "0 1px 0 0 rgba(0,0,0,0.15), 0 1px 2px rgba(0,0,0,0.1)",
        "emboss-active": "inset 0 1px 2px rgba(0,0,0,0.15)",
      },
    },
  },
  plugins: [],
};
