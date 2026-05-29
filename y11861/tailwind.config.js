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
        reservoir: {
          dark: '#0a0a1a',
          deep: '#0F2E68',
          water: '#00BCD4',
          danger: '#FF5722',
          warn: '#FF9800',
        },
      },
    },
  },
  plugins: [],
};
