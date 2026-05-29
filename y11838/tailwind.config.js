/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
    },
    extend: {
      colors: {
        primary: {
          50: "#f0f5fa",
          100: "#d9e4f0",
          200: "#b3c9e1",
          300: "#8daed2",
          400: "#6793c3",
          500: "#1e3a5f",
          600: "#1a3354",
          700: "#152d49",
          800: "#10263e",
          900: "#0b1f33",
        },
        accent: {
          gold: "#d4af37",
          profit: "#10b981",
          loss: "#e63946",
          warning: "#f59e0b",
          risk: "#ef4444",
        },
      },
      fontFamily: {
        display: ["Lora", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-up": "slideUp 0.3s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "fade-in": "fadeIn 0.5s ease-out",
        "risk-pulse": "riskPulse 1.5s ease-in-out infinite",
      },
      keyframes: {
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        riskPulse: {
          "0%, 100%": { "box-shadow": "0 0 0 0 rgba(230, 57, 70, 0.4)" },
          "50%": { "box-shadow": "0 0 0 10px rgba(230, 57, 70, 0)" },
        },
      },
    },
  },
  plugins: [],
};
