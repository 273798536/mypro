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
        navy: {
          50: '#E8EDF2',
          100: '#C5D1DE',
          200: '#9FB3C6',
          300: '#7995AE',
          400: '#5C7D9C',
          500: '#3F658A',
          600: '#35567A',
          700: '#294464',
          800: '#1E3350',
          900: '#0F2B46',
          950: '#091B2E',
        },
        port: {
          50: '#FEF3EC',
          100: '#FDE2D0',
          200: '#FBC4A4',
          300: '#F8A678',
          400: '#F08D5C',
          500: '#E87C3E',
          600: '#D4642E',
          700: '#B04C23',
          800: '#8C3A1B',
          900: '#6A2B14',
        },
        steel: {
          50: '#F4F6F8',
          100: '#E6EAEF',
          200: '#D0D8E1',
          300: '#B3BFC9',
          400: '#8FA0B0',
          500: '#6B7B8D',
          600: '#556475',
          700: '#44515F',
          800: '#38424E',
          900: '#2E363F',
        },
      },
      fontFamily: {
        sans: ['IBM Plex Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
