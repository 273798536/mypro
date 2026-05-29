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
        primary: "#1e3a5f",
        accent: "#d4a843",
        danger: "#e74c3c",
      },
      fontFamily: {
        display: ["DM Serif Display", "serif"],
      },
    },
  },
  plugins: [],
};
