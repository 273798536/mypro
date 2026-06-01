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
          50: "#eef5ff",
          100: "#d8e8ff",
          200: "#b8d5ff",
          300: "#88b9ff",
          400: "#5091ff",
          500: "#286ef7",
          600: "#104ed4",
          700: "#0e3ea8",
          800: "#103687",
          900: "#122f6f",
          950: "#0a1a42",
        },
        accent: {
          warning: "#e67e22",
          error: "#e74c3c",
          success: "#27ae60",
          info: "#3498db",
        },
        dark: {
          bg: "#0a1628",
          card: "#0f1f38",
          border: "#1e3a5f",
        },
      },
      fontFamily: {
        mono: ["'Roboto Mono'", "monospace"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(40, 110, 247, 0.5)" },
          "100%": { boxShadow: "0 0 20px rgba(40, 110, 247, 0.8)" },
        },
      },
    },
  },
  plugins: [],
};
