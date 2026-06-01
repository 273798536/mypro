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
          DEFAULT: '#1E3A5F',
          50: '#E8EEF5',
          100: '#D1DDEB',
          200: '#A4BBD7',
          300: '#7699C3',
          400: '#4A77AF',
          500: '#1E3A5F',
          600: '#182E4C',
          700: '#122339',
          800: '#0C1726',
          900: '#060C13',
        },
        secondary: {
          DEFAULT: '#F59E0B',
          50: '#FEF4E0',
          100: '#FDE9C1',
          200: '#FBD384',
          300: '#F9BD46',
          400: '#F7A809',
          500: '#F59E0B',
          600: '#C47E09',
          700: '#935F07',
          800: '#623F05',
          900: '#312002',
        },
        success: {
          DEFAULT: '#10B981',
          500: '#10B981',
        },
        danger: {
          DEFAULT: '#EF4444',
          500: '#EF4444',
        },
        muted: {
          DEFAULT: '#64748B',
          500: '#64748B',
        },
      },
      fontFamily: {
        sans: ['Inter', 'var(--font-sans)'],
        serif: ['Noto Serif SC', 'var(--font-serif)'],
      },
    },
  },
  plugins: [],
};
