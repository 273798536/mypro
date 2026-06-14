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
        studio: {
          bg: '#1a1a2e',
          card: '#2d2d44',
          border: '#3a3a55',
          amber: '#f0a500',
          amberDark: '#b37800',
          text: '#e8e8e8',
          muted: '#888888',
        },
      },
    },
  },
  plugins: [],
};
