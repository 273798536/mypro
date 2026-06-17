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
        brand: {
          50: '#f1f5fb',
          100: '#e1ecf7',
          200: '#b7d0ea',
          300: '#7ea8d6',
          400: '#4c7fbe',
          500: '#1e3a5f',
          600: '#18304e',
          700: '#132640',
          800: '#0e1c30',
          900: '#08111f',
        },
        sand: {
          50: '#fafaf7',
          100: '#f4f3ed',
          200: '#e9e6da',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', '"Songti SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', '-apple-system', 'BlinkMacSystemFont', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 2px 12px rgba(30, 58, 95, 0.06)',
        'soft-hover': '0 8px 24px rgba(30, 58, 95, 0.10)',
      },
    },
  },
  plugins: [],
};
