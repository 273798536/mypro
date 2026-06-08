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
        industrial: {
          bg: "#0B1929",
          panel: "#1E3A5F",
          border: "#2A4A6F",
          text: "#E8EDF3",
          muted: "#8D99AE",
        },
        status: {
          safe: "#2EC4B6",
          warning: "#FFD166",
          danger: "#FF6B35",
          critical: "#E63946",
          pending: "#8D99AE",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["IBM Plex Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["10px", "14px"],
      },
    },
  },
  plugins: [],
};
