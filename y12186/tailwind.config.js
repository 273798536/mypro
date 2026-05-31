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
          50: "#E8EBF0",
          100: "#C5CCD9",
          200: "#9BAABF",
          300: "#7088A5",
          400: "#4E6B8A",
          500: "#2D4D6F",
          600: "#263F5C",
          700: "#1F324A",
          800: "#1B2A4A",
          900: "#0F1A30",
        },
        amber: {
          400: "#F5C563",
          500: "#E8A838",
          600: "#D4922A",
        },
        sage: {
          400: "#8DB896",
          500: "#6B8F71",
          600: "#577559",
        },
        coral: {
          400: "#F08070",
          500: "#E85D4A",
          600: "#D14A38",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', "serif"],
        sans: ['"Noto Sans SC"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
    },
  },
  plugins: [],
};
