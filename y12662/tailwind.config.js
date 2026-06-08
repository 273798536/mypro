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
        marine: {
          50: "#f0f5fa",
          100: "#d9e4f0",
          200: "#b3c9e0",
          300: "#7fa5cb",
          400: "#4f7db2",
          500: "#2f5d94",
          600: "#1e3a5f",
          700: "#172d4a",
          800: "#12233a",
          900: "#0d1a2c",
          950: "#07101d",
        },
      },
      fontFamily: {
        sans: [
          "Source Han Sans CN",
          "Noto Sans SC",
          "-apple-system",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "SF Mono",
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        panel: "0 1px 3px rgba(7,16,29,0.12), 0 1px 2px rgba(7,16,29,0.08)",
        "panel-lg":
          "0 10px 25px rgba(7,16,29,0.15), 0 4px 10px rgba(7,16,29,0.08)",
      },
    },
  },
  plugins: [],
};
