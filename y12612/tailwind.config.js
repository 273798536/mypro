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
          50: '#eef3f9',
          100: '#d5e1ed',
          200: '#b2ccdf',
          300: '#84afcc',
          400: '#538cb6',
          500: '#2e6d9c',
          600: '#1e3a5f',
          700: '#1a2f4d',
          800: '#16263d',
          900: '#121f31',
        },
        danger: '#e74c3c',
        warning: '#f39c12',
        safe: '#2ecc71',
      },
      fontFamily: {
        sans: ['JetBrains Mono', 'monospace'],
        heading: ['Roboto Slab', 'serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
