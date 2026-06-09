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
        mine: {
          50: "#f0f6fd",
          100: "#dce8f7",
          200: "#b7d0ec",
          300: "#84afc9",
          400: "#5a8cb0",
          500: "#3d6f98",
          600: "#1E4570",
          700: "#163558",
          800: "#0F2744",
          900: "#0A1A2E",
        },
        amber: {
          glow: "#D4A853",
          light: "#E8C47A",
          dark: "#B8913F",
        },
        pore: {
          safe: "#2E7D6E",
          glow: "#4FB3A1",
        },
        warning: {
          review: "#E8C547",
          error: "#C94A4A",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(212, 168, 83, 0.3)",
        "glow-red": "0 0 20px rgba(201, 74, 74, 0.5)",
        "glow-green": "0 0 15px rgba(46, 125, 110, 0.4)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        float: "float 4s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
      },
    },
  },
  plugins: [],
};
