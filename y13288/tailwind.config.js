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
        teal: {
          DEFAULT: "#0F4C54",
          light: "#1A6B76",
          50: "#E8F4F5",
          100: "#C5E3E6",
        },
        orange: {
          DEFAULT: "#E8742C",
          light: "#F09452",
          50: "#FEF0E8",
          100: "#FDDDC8",
        },
        sand: {
          DEFAULT: "#F5F5F0",
          dark: "#E8E8E0",
        },
      },
    },
  },
  plugins: [],
};
