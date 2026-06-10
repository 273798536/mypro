/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
    },
    extend: {
      colors: {
        ink: {
          50: "#f7f9fc",
          100: "#eef2f8",
          200: "#d9e1ee",
          300: "#b6c5dd",
          400: "#6f87ad",
          500: "#4a648c",
          600: "#344d72",
          700: "#293d5c",
          800: "#1e3a5f",
          900: "#162b47",
          950: "#0e1d32",
        },
        amber: {
          50: "#fff8ed",
          100: "#ffedd4",
          200: "#ffd7a8",
          300: "#ffbb70",
          400: "#ff9537",
          500: "#f59e0b",
          600: "#d97706",
          700: "#b45309",
          800: "#92400e",
          900: "#78350f",
        },
        moss: {
          50: "#f3f8f4",
          100: "#e4efe5",
          200: "#c8dfcb",
          300: "#9cc5a2",
          400: "#68a472",
          500: "#458450",
          600: "#34683d",
          700: "#2a5332",
          800: "#23422a",
          900: "#1e3724",
        },
        rose: {
          50: "#fff5f5",
          100: "#ffe4e6",
          200: "#fecdd3",
          300: "#fda4af",
          400: "#fb7185",
          500: "#e11d48",
          600: "#be123c",
          700: "#9f1239",
          800: "#881337",
          900: "#4c0519",
        },
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: "0 1px 3px rgba(14, 29, 50, 0.06), 0 1px 2px rgba(14, 29, 50, 0.04)",
        cardHover: "0 4px 12px rgba(14, 29, 50, 0.08), 0 2px 4px rgba(14, 29, 50, 0.04)",
        glow: "0 0 0 3px rgba(30, 58, 95, 0.1)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.4" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.4s ease-out both",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
