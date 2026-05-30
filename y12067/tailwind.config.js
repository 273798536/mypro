/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#1a1a2e",
        "bg-light": "#16213e",
        "bg-card": "#0f3460",
        accent: "#ff6b35",
        "accent-hover": "#ff8c5a",
        safe: "#00c853",
        danger: "#d32f2f",
        warn: "#fbc02d",
        info: "#4fc3f7",
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
        sans: ["Noto Sans SC", "sans-serif"],
      },
    },
  },
  plugins: [],
};
