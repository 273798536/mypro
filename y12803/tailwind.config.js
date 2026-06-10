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
          DEFAULT: "#2D6A4F",
          light: "#52B788",
          dark: "#1B4332",
        },
        accent: "#E09F3E",
        info: "#577590",
        surface: {
          DEFAULT: "#F8F9FA",
          dark: "#E9ECEF",
        },
        danger: "#E63946",
        pending: "#457B9D",
      },
      fontFamily: {
        heading: ['"Source Serif 4"', "Georgia", "serif"],
        body: ['"DM Sans"', "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
    },
  },
  plugins: [],
};
