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
        primary: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fb',
          400: '#36aaf6',
          500: '#0c8ee7',
          600: '#0071c5',
          700: '#015aa0',
          800: '#064c84',
          900: '#0b406e',
          950: '#0F3B5F',
        },
        brand: {
          DEFAULT: '#0F3B5F',
          light: '#1e5a8a',
          dark: '#082640',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
    },
  },
  plugins: [],
};
