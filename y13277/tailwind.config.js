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
        "fire-deep": "#1a1a2e",
        "fire-orange": "#e94560",
        "fire-white": "#f5f5f0",
        "caliber-blue": "#0f3460",
        "success-green": "#16c79a",
        "duplicate-yellow": "#f5a623",
      },
      fontFamily: {
        serif: ["Noto Serif SC", "serif"],
        sans: ["Noto Sans SC", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-orange": "pulse-orange 2s ease-in-out infinite",
        "pulse-green": "pulse-green 2s ease-in-out infinite",
      },
      keyframes: {
        "pulse-orange": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(233, 69, 96, 0.7)" },
          "50%": { boxShadow: "0 0 0 12px rgba(233, 69, 96, 0)" },
        },
        "pulse-green": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(22, 199, 154, 0.7)" },
          "50%": { boxShadow: "0 0 0 12px rgba(22, 199, 154, 0)" },
        },
      },
    },
  },
  plugins: [],
};
