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
        studio: {
          bg: "#1a1a2e",
          surface: "#16213e",
          card: "#1f2b47",
          border: "#2a3a5c",
          amber: "#f0a500",
          "amber-dim": "#c48800",
          mint: "#4ecca3",
          coral: "#e84545",
          muted: "#8892a8",
          text: "#e8e8e8",
          "text-dim": "#a0a8b8",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', "serif"],
        sans: ['"Noto Sans SC"', "sans-serif"],
      },
      animation: {
        "pulse-coral": "pulse-coral 2s ease-in-out infinite",
      },
      keyframes: {
        "pulse-coral": {
          "0%, 100%": { borderColor: "rgba(232, 69, 69, 0.3)" },
          "50%": { borderColor: "rgba(232, 69, 69, 0.8)" },
        },
      },
    },
  },
  plugins: [],
};
