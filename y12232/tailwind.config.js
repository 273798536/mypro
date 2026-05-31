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
          DEFAULT: "#1e3a5f",
          50: "#e8edf4",
          100: "#c5d1e3",
          200: "#9fb3d0",
          300: "#7995bc",
          400: "#5c7ead",
          500: "#3f679e",
          600: "#355d94",
          700: "#294f86",
          800: "#1e3a5f",
          900: "#152a45",
        },
        danger: {
          DEFAULT: "#d9534f",
          light: "#e88a87",
          dark: "#b73232",
        },
        success: {
          DEFAULT: "#5cb85c",
          light: "#8fd18f",
          dark: "#3d8b3d",
        },
        warning: {
          DEFAULT: "#f0ad4e",
          light: "#f5c978",
          dark: "#c88a24",
        },
        surface: {
          DEFAULT: "#f5f6f8",
          card: "#ffffff",
          border: "#d6dae0",
          hover: "#ebedf1",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', "serif"],
        mono: ['"JetBrains Mono"', "monospace"],
        sans: ['"Noto Sans SC"', "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "count-up": "countUp 0.6s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        countUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
