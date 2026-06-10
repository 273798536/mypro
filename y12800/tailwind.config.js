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
        qc: {
          teal: '#0F766E',
          'teal-light': '#14B8A6',
          'teal-dark': '#0D5D56',
          amber: '#D97706',
          'amber-light': '#FCD34D',
          'amber-bg': '#FFFBEB',
        },
      },
      fontFamily: {
        display: ['Lora', 'Georgia', 'serif'],
        body: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
