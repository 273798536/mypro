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
          900: '#0f1b2d',
          800: '#1a2744',
          700: '#24365e',
          600: '#2e4578',
        },
        amber: {
          400: '#d4a843',
          300: '#e0be6a',
          200: '#ecd491',
        },
        status: {
          processed: '#10b981',
          pending: '#3b82f6',
          evidence: '#ef4444',
        },
      },
      fontFamily: {
        serif: ['Noto Serif SC', 'serif'],
        sans: ['Noto Sans SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
