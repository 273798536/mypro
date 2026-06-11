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
        museum: {
          bg: '#0d0d1a',
          surface: '#12121f',
          border: '#2a2a3e',
          gold: '#d4a853',
          coral: '#e74c3c',
          text: '#e8e8f0',
          muted: '#6a6a8e',
        }
      }
    },
  },
  plugins: [],
};
