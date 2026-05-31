
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
        amber: {
          400: '#D4AF37',
          500: '#C4A030',
          600: '#B08020',
        },
      },
    },
  },
  plugins: [],
};

