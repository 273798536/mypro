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
        base: {
          900: "#1a1d23",
          800: "#1e2128",
          700: "#2a2d35",
          600: "#363940",
          500: "#4a4d55",
          400: "#6b7080",
          300: "#8b90a0",
          200: "#b0b5c5",
          100: "#d0d5e0",
        },
        amber: {
          DEFAULT: "#f59e0b",
          light: "#fbbf24",
          dark: "#d97706",
        },
        safe: {
          DEFAULT: "#10b981",
          light: "#34d399",
          dark: "#059669",
        },
        danger: {
          DEFAULT: "#ef4444",
          light: "#f87171",
          dark: "#dc2626",
        },
        info: {
          DEFAULT: "#3b82f6",
          light: "#60a5fa",
          dark: "#2563eb",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "monospace"],
        sans: ["Noto Sans SC", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "lock-spin": "spin 0.5s ease-in-out",
        "fade-in-up": "fadeInUp 0.5s ease-out forwards",
        "flash-twice": "flashTwice 1s ease-out",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        flashTwice: {
          "0%, 100%": { opacity: "1" },
          "25%": { opacity: "0.3" },
          "50%": { opacity: "1" },
          "75%": { opacity: "0.3" },
        },
      },
    },
  },
  plugins: [],
};
