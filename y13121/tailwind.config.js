/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        display: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['IBM Plex Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        navy: {
          50: '#e8ecf4',
          100: '#c5cee2',
          200: '#9eaed0',
          300: '#778dbe',
          400: '#5974b0',
          500: '#3b5ba3',
          600: '#35509b',
          700: '#2b4290',
          800: '#1a365d',
          900: '#0f1f3a',
        },
      },
    },
  },
  plugins: [],
};
