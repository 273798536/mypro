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
        'theater-dark': '#0D1117',
        'theater-gold': '#E8A838',
        'theater-red': '#FF4757',
        'theater-green': '#2ED573',
        'theater-orange': '#FFA502',
        'theater-pink': '#FF6B81',
      },
    },
  },
  plugins: [],
};
