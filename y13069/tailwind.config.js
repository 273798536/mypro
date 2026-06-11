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
        brass: {
          50: "#FBF6EA",
          100: "#F5EBC8",
          200: "#EDD997",
          300: "#E4C466",
          400: "#D9B33E",
          500: "#C9A962",
          600: "#B8913F",
          700: "#997533",
          800: "#745828",
          900: "#4F3B1B",
          950: "#2E210E",
        },
        stage: {
          900: "#07111F",
          800: "#0A1628",
          700: "#0D1C33",
          600: "#0F2038",
        },
      },
      fontFamily: {
        display: ["'Playfair Display'", "serif"],
        mono: ["'JetBrains Mono'", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
