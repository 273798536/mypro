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
          DEFAULT: "#0F3460",
          50: "#E6EEF7",
          100: "#C2D3EB",
          200: "#9AB6DD",
          300: "#6A93CC",
          400: "#3E73BB",
          500: "#0F3460",
          600: "#0C2B50",
          700: "#092040",
          800: "#061630",
          900: "#030C20",
        },
        danger: {
          DEFAULT: "#E94560",
          50: "#FCE8ED",
          100: "#F8C5D0",
          200: "#F49EAF",
          300: "#EF768D",
          400: "#EB4E6B",
          500: "#E94560",
          600: "#C93750",
          700: "#A92940",
          800: "#891B30",
          900: "#690D20",
        },
        success: {
          DEFAULT: "#16C79A",
          500: "#16C79A",
          600: "#12A681",
        },
        warning: {
          DEFAULT: "#FFB800",
          500: "#FFB800",
        },
        dark: {
          900: "#0A1628",
          800: "#122238",
          700: "#1A2E4A",
          600: "#223A5C",
          500: "#2A466E",
        },
      },
      fontFamily: {
        serif: ['"Source Han Serif SC"', '"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Source Han Sans SC"', '"Noto Sans SC"', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.8)', opacity: '0.8' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
};
