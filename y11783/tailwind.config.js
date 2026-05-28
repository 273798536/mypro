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
        chalk: {
          yellow: "#fbbf24",
          green: "#34d399",
          red: "#f87171",
          slate: "#1e293b",
        },
      },
      fontFamily: {
        wenkai: ["'LXGW WenKai'", "cursive"],
        sans: ["'Noto Sans SC'", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "pulse-glow": "pulseGlow 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(251, 191, 36, 0)" },
          "50%": { boxShadow: "0 0 12px 2px rgba(251, 191, 36, 0.3)" },
        },
      },
    },
  },
  plugins: [],
};
