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
        'deep-blue': {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc7fb',
          400: '#36a8f6',
          500: '#0c8ce6',
          600: '#006fc4',
          700: '#01599f',
          800: '#064c83',
          900: '#0b416d',
          950: '#072242',
        },
        'ocean': {
          bg: '#0a1628',
          panel: '#0f2137',
          border: '#1e3a5f',
          text: '#e2e8f0',
          'text-muted': '#94a3b8',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Noto Sans SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
