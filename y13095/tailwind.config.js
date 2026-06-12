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
        space: {
          50: "#f0f7ff",
          100: "#e0efff",
          200: "#bae0ff",
          300: "#7cc7ff",
          400: "#36a7ff",
          500: "#0c8af0",
          600: "#006dd0",
          700: "#0157a6",
          800: "#064988",
          900: "#0a1628",
          950: "#050d18",
        },
        aviation: {
          blue: "#1e40af",
          green: "#059669",
          orange: "#d97706",
          red: "#dc2626",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "ring-expand": "ring-expand 1.5s ease-out infinite",
      },
      keyframes: {
        "ring-expand": {
          "0%": { transform: "scale(1)", opacity: "0.8" },
          "100%": { transform: "scale(2.5)", opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};
