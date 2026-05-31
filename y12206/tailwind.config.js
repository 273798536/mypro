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
          50: "#E8ECF1",
          100: "#C5CFDF",
          200: "#9DAECC",
          300: "#758EB9",
          400: "#5674AA",
          500: "#375A9B",
          600: "#315293",
          700: "#2A4888",
          800: "#233F7E",
          900: "#1B2A4A",
        },
        accent: {
          50: "#FDF8E8",
          100: "#FAEDC6",
          200: "#F6E09F",
          300: "#F2D378",
          400: "#EFC959",
          500: "#D4A843",
          600: "#B88B2E",
          700: "#9C6F1E",
          800: "#805512",
          900: "#6C420A",
        },
        slate: {
          50: "#F7F8FA",
          100: "#E8ECF1",
          200: "#D1D7E0",
          300: "#AAB3C2",
          400: "#7C889D",
          500: "#5D6B82",
          600: "#4A566B",
          700: "#3C4556",
          800: "#323846",
          900: "#2C303B",
        },
      },
      fontFamily: {
        sans: ["Noto Sans SC", "system-ui", "sans-serif"],
        mono: ["Noto Sans Mono", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
