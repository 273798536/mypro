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
        'ocean': {
          50: '#E8F4F8',
          100: '#C5E3ED',
          200: '#9CCFE0',
          300: '#6FB9D3',
          400: '#4AA8C9',
          500: '#2980B9',
          600: '#1B6CA8',
          700: '#0F4C75',
          800: '#0A3A5A',
          900: '#06283D',
        },
        'tank': {
          normal: '#27AE60',
          warning: '#F39C12',
          error: '#E74C3C',
          recovered: '#48C9B0',
        }
      },
      fontFamily: {
        'display': ['"ZCOOL QingKe HuangYou"', 'cursive'],
        'body': ['"Noto Sans SC"', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ripple': 'ripple 1s ease-out forwards',
      },
      keyframes: {
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        }
      }
    },
  },
  plugins: [],
};
