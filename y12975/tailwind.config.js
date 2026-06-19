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
        bg: {
          DEFAULT: "#0c0d0f",
          surface: "#16181c",
          raised: "#1e2028",
          hover: "#26282e",
        },
        border: {
          DEFAULT: "#26282e",
          subtle: "#1e2028",
          strong: "#3a3d45",
        },
        signal: {
          lime: "#d4ff4d",
          amber: "#ffb86b",
          coral: "#ff6b6b",
          sky: "#7dd3fc",
          limeDim: "#a3cc3a",
          amberDim: "#cc9456",
          coralDim: "#cc5555",
          skyDim: "#5ba8cc",
        },
        txt: {
          DEFAULT: "#e7e5e4",
          muted: "#8b8b8b",
          dim: "#5a5a5a",
        },
      },
      fontFamily: {
        serif: ["Instrument Serif", "Georgia", "serif"],
        sans: ["Hanken Grotesk", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
    },
  },
  plugins: [],
};
