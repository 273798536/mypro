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
          50: "#F0F4F9",
          100: "#D9E3F0",
          200: "#B3C7E1",
          300: "#8DABD2",
          400: "#678FC3",
          500: "#4173B4",
          600: "#2E5A90",
          700: "#1F426C",
          800: "#0F3460",
          900: "#0A2442",
        },
        accent: {
          warning: "#FF6B35",
          success: "#2ECC71",
          danger: "#E74C3C",
        },
        neutral: {
          bg: "#FAFAF7",
          text: "#2C3E50",
          border: "#E0E0E0",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', "serif"],
        sans: ['"Source Han Sans CN"', '"Noto Sans SC"', "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "4px",
        md: "6px",
        lg: "8px",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        cardHover: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-in-out",
        "slide-up": "slideUp 0.3s ease-out",
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
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
      },
    },
  },
  plugins: [],
};
