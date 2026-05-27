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
        seismic: {
          bg: '#0a0e1a',
          pWave: '#00e5ff',
          sWave: '#ff4081',
          epicenter: '#ff6b35',
        },
      },
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        body: ['Noto Sans SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
