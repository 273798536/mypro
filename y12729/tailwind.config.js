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
        deep: {
          900: "#0A1628",
          800: "#0F2540",
          700: "#163154",
          600: "#1E3F6B",
        },
        accent: {
          cyan: "#00B4D8",
          "cyan-light": "#48CAE4",
          amber: "#F4A261",
          green: "#2A9D8F",
          red: "#E63946",
          "red-light": "#EF6B76",
        },
        neutral: {
          50: "#F8FAFC",
          100: "#E2E8F0",
          200: "#94A3B8",
          300: "#64748B",
          400: "#475569",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "ui-monospace", "monospace"],
        sans: ["Noto Sans SC", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "fade-in": "fade-in 0.4s ease-out",
        "slide-up": "slide-up 0.3s ease-out",
        "stripe-move": "stripe-move 0.8s linear infinite",
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { filter: "drop-shadow(0 0 4px #00B4D8) drop-shadow(0 0 8px #00B4D8)" },
          "50%": { filter: "drop-shadow(0 0 12px #00B4D8) drop-shadow(0 0 20px #48CAE4)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "slide-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "stripe-move": {
          "0%": { backgroundPosition: "0 0" },
          "100%": { backgroundPosition: "20px 0" },
        },
      },
    },
  },
  plugins: [],
};
