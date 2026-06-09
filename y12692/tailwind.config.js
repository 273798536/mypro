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
          50: "#E8EEF7",
          100: "#C7D3E8",
          200: "#95A9CC",
          300: "#637FB0",
          400: "#3A5584",
          500: "#1F3A66",
          600: "#0F2747",
          700: "#0A1B33",
          800: "#061224",
          900: "#030914",
        },
        lattice: {
          DEFAULT: "#3DDC97",
          soft: "#6FE6B2",
          deep: "#1BA86D",
        },
        warn: {
          DEFAULT: "#FF8C42",
          soft: "#FFB079",
        },
        pass: {
          DEFAULT: "#2EC27E",
          soft: "#69D8A4",
        },
        alert: {
          DEFAULT: "#E63946",
          soft: "#F07B85",
        },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', "Georgia", "serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
      },
      boxShadow: {
        glow: "0 0 24px rgba(61, 220, 151, 0.25)",
        warn: "0 0 18px rgba(255, 140, 66, 0.35)",
      },
      animation: {
        "pulse-slow": "pulse 3s ease-in-out infinite",
        "blink-warn": "blinkWarn 1.2s ease-in-out infinite",
        "fade-in": "fadeIn 0.45s ease-out both",
        "slide-up": "slideUp 0.35s ease-out both",
      },
      keyframes: {
        blinkWarn: {
          "0%,100%": { opacity: "1" },
          "50%": { opacity: "0.45" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
