/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: "#1a1a2e",
          secondary: "#16213e",
          panel: "#0f3460",
        },
        accent: {
          primary: "#e94560",
          secondary: "#533483",
        },
        text: {
          primary: "#ffffff",
          secondary: "#a0aec0",
          muted: "#718096",
        },
      },
      fontFamily: {
        mono: ["DM Mono", "monospace"],
        sans: ["Noto Sans SC", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(233, 69, 96, 0.3)",
        "glow-sm": "0 0 10px rgba(233, 69, 96, 0.2)",
      },
    },
  },
  plugins: [],
};
