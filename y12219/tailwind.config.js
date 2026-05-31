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
          DEFAULT: '#1a2332',
          light: '#2a3a4f',
        },
        accent: {
          DEFAULT: '#d4943a',
          light: '#e4a44a',
          dark: '#c4842a',
        },
      },
    },
  },
  plugins: [],
};
