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
        navy: {
          50: "#F0F5FF",
          100: "#D9E4FF",
          200: "#B3CCFF",
          300: "#7FA8FF",
          400: "#4D80E6",
          500: "#2B5FB8",
          600: "#1E4A8F",
          700: "#153870",
          800: "#0F2A4A",
          900: "#0A1E38",
          950: "#061425",
        },
        amber: {
          400: "#FFA94D",
          500: "#FF8A3D",
          600: "#F06C1F",
        },
        emerald: {
          400: "#34D399",
          500: "#22C55E",
          600: "#16A34A",
        },
        slate: {
          850: "#152238",
          900: "#0F172A",
          950: "#0A1020",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in-up": "fadeInUp 0.5s ease-out forwards",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(255, 138, 61, 0.3)" },
          "100%": { boxShadow: "0 0 20px rgba(255, 138, 61, 0.6)" },
        },
      },
    },
  },
  plugins: [],
};
