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
          primary: "#0f0f1a",
          secondary: "#1a1a2e",
          tertiary: "#242440",
        },
        amber: {
          dim: "#b45309",
        },
        cyan: {
          dim: "#0e7490",
        },
        border: "#2d2d4a",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
        sans: ["Noto Sans SC", "sans-serif"],
      },
    },
  },
  plugins: [],
};
