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
          DEFAULT: '#165DFF',
          50: '#E8F3FF',
          100: '#B9DBFF',
          200: '#8ABEFF',
          300: '#5BA1FF',
          400: '#2D84FF',
          500: '#165DFF',
          600: '#0E47CC',
          700: '#0A3499',
          800: '#072266',
          900: '#031133',
        },
        warning: {
          DEFAULT: '#FF7D00',
          50: '#FFF1E6',
          100: '#FFD9B8',
          200: '#FFC18A',
          300: '#FFA85C',
          400: '#FF902E',
          500: '#FF7D00',
          600: '#CC6400',
          700: '#994B00',
          800: '#663200',
          900: '#331900',
        },
        danger: {
          DEFAULT: '#F53F3F',
          50: '#FFECE8',
          100: '#FDCCC6',
          200: '#F9998F',
          300: '#F66659',
          400: '#F53F3F',
          500: '#CB2634',
          600: '#A11B2E',
          700: '#771328',
          800: '#4D0B21',
          900: '#24031B',
        },
        success: {
          DEFAULT: '#00B42A',
          50: '#E8FFEA',
          100: '#B9F2C1',
          200: '#8AE598',
          300: '#5BD96F',
          400: '#2ECC46',
          500: '#00B42A',
          600: '#008F22',
          700: '#006A19',
          800: '#004411',
          900: '#001F08',
        },
        industrial: {
          bg: '#1D2129',
          panel: '#2A2F3A',
          border: '#C9CDD4',
          text: '#F2F3F5',
          muted: '#86909C',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Noto Sans SC', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'highlight': 'highlight 2s ease-in-out infinite',
      },
      keyframes: {
        highlight: {
          '0%, 100%': { backgroundColor: 'rgba(255, 215, 0, 0.2)' },
          '50%': { backgroundColor: 'rgba(255, 215, 0, 0.5)' },
        }
      }
    },
  },
  plugins: [],
};
