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
          50: "#f5f7fa",
          100: "#e4eaf2",
          200: "#c5d3e4",
          300: "#97b0cc",
          400: "#6287ae",
          500: "#3e6590",
          600: "#2e4e75",
          700: "#1e3a5f",
          800: "#172e4d",
          900: "#0f1f34",
        },
        alert: {
          DEFAULT: "#e03131",
          soft: "#fff5f5",
        },
        confirm: {
          DEFAULT: "#2f9e44",
          soft: "#ebfbee",
        },
        warn: {
          DEFAULT: "#f59f00",
          soft: "#fff9db",
        },
        ivory: "#fafaf7",
        graphite: "#495057",
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', "Georgia", "serif"],
        sans: ['"Noto Sans SC"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(30, 58, 95, 0.06), 0 1px 2px rgba(30, 58, 95, 0.04)",
        "card-hover": "0 4px 12px rgba(30, 58, 95, 0.10)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseDot: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.6)", opacity: "0.4" },
        },
        modalIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.5s ease-out both",
        "pulse-dot": "pulseDot 2s ease-in-out infinite",
        "modal-in": "modalIn 0.2s ease-out both",
      },
    },
  },
  plugins: [],
};
