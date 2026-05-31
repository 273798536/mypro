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
          50: '#f0f5fa',
          100: '#d9e4f0',
          200: '#b3c9e1',
          300: '#82a8ce',
          400: '#5284b8',
          500: '#33689f',
          600: '#2a5485',
          700: '#1e3a5f',
          800: '#182e4c',
          900: '#14253d',
        },
        accent: {
          gold: '#d4af37',
          amber: '#ff9500',
        },
        success: '#22c55e',
        danger: '#ef4444',
        warning: '#f59e0b',
      },
      fontFamily: {
        sans: ['"Source Han Sans"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
