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
        paper: "#F5F2EC",
        surface: "#FBF9F4",
        ink: "#1C1B17",
        muted: "#6B6657",
        line: "#E0DACD",
        accent: {
          DEFAULT: "#0F4C5C",
          soft: "#E3EDEF",
        },
        signal: {
          DEFAULT: "#C44536",
          soft: "#F6E4E1",
        },
        status: {
          processed: "#3A7D44",
          pending: "#B8860B",
          overridden: "#9B2226",
        },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', '"PingFang SC"', '"Noto Sans SC"', "sans-serif"],
        sans: ['"Hanken Grotesk"', '"PingFang SC"', '"Noto Sans SC"', "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(28,27,23,0.04), 0 8px 24px -12px rgba(28,27,23,0.12)",
      },
      backgroundImage: {
        "grid-lines":
          "linear-gradient(to right, rgba(28,27,23,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(28,27,23,0.045) 1px, transparent 1px)",
      },
      backgroundSize: {
        "grid-32": "32px 32px",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.8)", opacity: "0.7" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
        "pulse-ring": "pulse-ring 1.8s ease-out infinite",
      },
    },
  },
  plugins: [],
};
