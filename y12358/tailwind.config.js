/** @type {import('tailwindcss').Config} */

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#1677ff',
          600: '#0958d9',
          700: '#0050b3',
          800: '#003a8c',
          900: '#002766',
        },
        industrial: {
          50: '#f0f5ff',
          100: '#e6f0ff',
          200: '#bae0ff',
          300: '#91caff',
          400: '#69b1ff',
          500: '#1677ff',
          600: '#0958d9',
          700: '#0050b3',
          800: '#003a8c',
          900: '#002766',
        },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Noto Sans', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
