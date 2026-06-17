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
        ink: {
          950: "#08080a",
          900: "#0e0e11",
          850: "#131317",
          800: "#1a1a1f",
          750: "#222228",
          700: "#2a2a31",
          600: "#3a3a44",
          500: "#56565f",
          400: "#8a8a96",
          300: "#b4b4be",
          200: "#d8d8de",
          100: "#ececef",
        },
        signal: {
          DEFAULT: "#bef264",
          50: "#f7fee7",
          300: "#d9f99d",
          400: "#bef264",
          500: "#a3e635",
          600: "#84cc16",
        },
        warn: {
          DEFAULT: "#fbbf24",
          400: "#fbbf24",
          500: "#f59e0b",
          300: "#fcd34d",
        },
        danger: {
          DEFAULT: "#fb7185",
          400: "#fb7185",
          500: "#f43f5e",
          300: "#fda4af",
        },
        info: {
          DEFAULT: "#67e8f9",
          400: "#22d3ee",
          300: "#67e8f9",
        },
      },
      fontFamily: {
        serif: ['"Instrument Serif"', "Georgia", "serif"],
        sans: ['"Hanken Grotesk"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightish: "-0.01em",
        tighter2: "-0.02em",
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(190,242,100,0.18), 0 8px 40px -12px rgba(190,242,100,0.22)",
        inset1: "inset 0 1px 0 0 rgba(255,255,255,0.04)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "scan": {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(900%)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "0.55" },
          "50%": { opacity: "1" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s cubic-bezier(0.22,1,0.36,1) both",
        "scan": "scan 4s linear infinite",
        "pulse-soft": "pulse-soft 2.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
