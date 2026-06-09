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
          50: "#eef3f9",
          100: "#d6e2ef",
          200: "#adc5df",
          300: "#7fa1cb",
          400: "#517db6",
          500: "#2f5f9c",
          600: "#1e3a5f",
          700: "#172e4b",
          800: "#112137",
          900: "#0b1522",
        },
        amber: {
          500: "#d97706",
          600: "#b45309",
        },
        teal: {
          500: "#0d9488",
          600: "#0f766e",
        },
        slate: {
          50: "#f8fafc",
          100: "#e8eef5",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', "Georgia", "serif"],
        sans: ['"Noto Sans SC"', "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(30,58,95,0.08), 0 1px 2px rgba(30,58,95,0.06)",
        "card-hover": "0 4px 12px rgba(30,58,95,0.12), 0 2px 4px rgba(30,58,95,0.08)",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-down": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "glow": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(13,148,136,0.0)" },
          "50%": { boxShadow: "0 0 0 4px rgba(13,148,136,0.2)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.4s ease-out both",
        "slide-down": "slide-down 0.3s ease-out both",
        "pulse-soft": "pulse-soft 1.2s ease-in-out 2",
        "glow": "glow 1s ease-in-out 2",
      },
    },
  },
  plugins: [],
};
