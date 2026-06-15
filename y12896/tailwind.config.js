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
        ocean: {
          50: "#F0F4F8",
          100: "#D9E6F1",
          200: "#B3CDE3",
          300: "#6FA8CD",
          400: "#3B82B9",
          500: "#1E5F99",
          600: "#15507D",
          700: "#0F3F63",
          800: "#0A2342",
          900: "#061629",
        },
        tide: {
          green: "#00C9A7",
          teal: "#2EC4B6",
          warning: "#FFB703",
          danger: "#FF6B35",
          shutdown: "#E63946",
        },
      },
      fontFamily: {
        sans: [
          "Noto Sans SC",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        mono: ["JetBrains Mono", "Menlo", "Monaco", "Courier New", "monospace"],
      },
      animation: {
        "flow-right": "flowRight 3s linear infinite",
        "flow-left": "flowLeft 3s linear infinite",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "slide-in": "slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        flowRight: {
          "0%": { transform: "translateX(-20px)", opacity: "0" },
          "50%": { opacity: "1" },
          "100%": { transform: "translateX(20px)", opacity: "0" },
        },
        flowLeft: {
          "0%": { transform: "translateX(20px)", opacity: "0" },
          "50%": { opacity: "1" },
          "100%": { transform: "translateX(-20px)", opacity: "0" },
        },
        slideIn: {
          "0%": { transform: "translateX(100%)", opacity: "0" },
          "100%": { transform: "translateX(0)", opacity: "1" },
        },
      },
      boxShadow: {
        glow: "0 0 40px rgba(0, 201, 167, 0.15)",
        danger: "0 0 40px rgba(255, 107, 53, 0.25)",
      },
    },
  },
  plugins: [],
};
