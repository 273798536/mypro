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
        ink: {
          50: '#f0f7fa',
          100: '#d9eaf1',
          500: '#0F2F3C',
          600: '#0b2530',
          700: '#081c24',
          900: '#030b0f',
        },
        bamboo: {
          300: '#A7F3D0',
          500: '#34d399',
        },
        amberWb: {
          400: '#F59E0B',
          500: '#d97706',
        },
        roseWb: {
          500: '#E11D48',
          600: '#be123c',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
