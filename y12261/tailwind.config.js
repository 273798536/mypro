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
        primary: {
          50: "#E8F3FF",
          100: "#B9DBFF",
          200: "#8BC4FF",
          300: "#5CADFF",
          400: "#2E96FF",
          500: "#165DFF",
          600: "#0E42D2",
          700: "#0A2BA0",
          800: "#061A6E",
          900: "#030D3C",
        },
        danger: {
          50: "#FFF1F0",
          100: "#FFCECC",
          200: "#FFABA6",
          300: "#FF8880",
          400: "#FF6559",
          500: "#F53F3F",
          600: "#CB2634",
          700: "#A11229",
          800: "#77071F",
          900: "#4D0316",
        },
        warning: {
          500: "#FF7D00",
          600: "#D25F00",
        },
        factory: {
          bg: "#0F172A",
          panel: "#1E293B",
          border: "#334155",
          text: "#E2E8F0",
          muted: "#94A3B8",
          accent: "#38BDF8",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Menlo", "monospace"],
        sans: ["Helvetica Neue", "Arial", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "flash-border": "flashBorder 1s ease-in-out infinite",
        "slide-in": "slideIn 0.3s ease-out",
        "gear-spin": "spin 8s linear infinite",
      },
      keyframes: {
        flashBorder: {
          "0%, 100%": { boxShadow: "0 0 0 2px rgba(245, 63, 63, 0.3)" },
          "50%": { boxShadow: "0 0 0 4px rgba(245, 63, 63, 0.8)" },
        },
        slideIn: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
