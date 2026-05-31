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
          50: '#E8EBF0',
          100: '#C5CBD9',
          200: '#8B96B3',
          300: '#51628D',
          400: '#2E4170',
          500: '#1B2A4A',
          600: '#162240',
          700: '#111A33',
          800: '#0C1226',
          900: '#070919',
        },
        amber: {
          400: '#F5B668',
          500: '#E8913A',
          600: '#D07A2B',
        },
        emerald: {
          400: '#4ECBA0',
          500: '#2D9D78',
          600: '#238060',
        },
        coral: {
          400: '#F08080',
          500: '#E05252',
          600: '#C43838',
        },
      },
      fontFamily: {
        serif: ['DM Serif Display', 'Georgia', 'serif'],
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
