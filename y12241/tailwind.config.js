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
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
          950: "#082f49",
        },
        circuit: {
          dark: "#0F172A",
          darker: "#020617",
          amber: "#F59E0B",
          red: "#EF4444",
          cyan: "#06B6D4",
          purple: "#8B5CF6",
          green: "#10B981",
          orange: "#F97316",
        },
      },
      fontFamily: {
        display: ["Orbitron", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "current-flow": "currentFlow 2s linear infinite",
        "glow-amber": "glowAmber 2s ease-in-out infinite alternate",
        "glow-red": "glowRed 1s ease-in-out infinite alternate",
        "glow-cyan": "glowCyan 2s ease-in-out infinite alternate",
        "ripple": "ripple 1s ease-out forwards",
        "logic-chain": "logicChain 0.8s ease-out forwards",
      },
      keyframes: {
        currentFlow: {
          "0%": { strokeDashoffset: "20" },
          "100%": { strokeDashoffset: "0" },
        },
        glowAmber: {
          "0%": { boxShadow: "0 0 5px #F59E0B, 0 0 10px #F59E0B" },
          "100%": { boxShadow: "0 0 15px #F59E0B, 0 0 30px #F59E0B" },
        },
        glowRed: {
          "0%": { boxShadow: "0 0 5px #EF4444, 0 0 10px #EF4444" },
          "100%": { boxShadow: "0 0 20px #EF4444, 0 0 40px #EF4444" },
        },
        glowCyan: {
          "0%": { boxShadow: "0 0 5px #06B6D4, 0 0 10px #06B6D4" },
          "100%": { boxShadow: "0 0 15px #06B6D4, 0 0 30px #06B6D4" },
        },
        ripple: {
          "0%": { transform: "scale(0)", opacity: "1" },
          "100%": { transform: "scale(4)", opacity: "0" },
        },
        logicChain: {
          "0%": { strokeDashoffset: "100", opacity: "0" },
          "100%": { strokeDashoffset: "0", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
