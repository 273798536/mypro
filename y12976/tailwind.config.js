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
        terracotta: {
          50: '#fdf4f0',
          100: '#fbe8df',
          200: '#f7d1be',
          300: '#f1b092',
          400: '#e9865f',
          500: '#e0663e',
          600: '#c85030',
          700: '#a63e28',
          800: '#853426',
          900: '#6d2e22',
          950: '#3a140e',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['IBM Plex Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
