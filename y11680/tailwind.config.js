/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e6f7ff',
          100: '#b3e6ff',
          200: '#80d4ff',
          300: '#4dc3ff',
          400: '#26b5ff',
          500: '#00d4ff',
          600: '#00a8cc',
          700: '#007a99',
          800: '#005566',
          900: '#002d33',
        },
        accent: {
          500: '#ff6b35',
          600: '#e55a2b',
        },
        dark: {
          800: '#1a2d4a',
          900: '#0a1628',
          950: '#050d18',
        }
      },
      fontFamily: {
        mono: ['Roboto Mono', 'monospace'],
        display: ['Orbitron', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
