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
          900: '#0A1628',
          800: '#0d1b2a',
          700: '#1b2838',
        }
      },
    },
  },
  plugins: [],
};
