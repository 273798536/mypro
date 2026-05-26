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
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#0F2A4A',
        },
        gold: {
          50: '#fef9e7',
          100: '#fcf0c2',
          200: '#f8e08a',
          300: '#f2d052',
          400: '#e6c030',
          500: '#D4AF37',
          600: '#b69327',
          700: '#8f711c',
          800: '#6b5314',
          900: '#4d3c0d',
        },
      },
      fontFamily: {
        display: ['"Noto Serif SC"', 'serif'],
        body: ['"Noto Sans SC"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
