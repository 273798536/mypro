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
        ocean: {
          deep: "#0a2463",
          mid: "#1b4965",
          light: "#3e92cc",
          surface: "#5dade2",
        },
        gold: {
          DEFAULT: "#e9b44c",
          dark: "#c49a3c",
        },
        danger: {
          DEFAULT: "#d8315b",
          dark: "#a01535",
        },
        success: "#4cd137",
        warning: "#ffa500",
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
        display: ["'Orbitron'", "monospace"],
        body: ["'Noto Sans SC'", "sans-serif"],
      },
    },
  },
  plugins: [],
};
