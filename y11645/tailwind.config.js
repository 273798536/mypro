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
        'aviation': {
          50: '#E8F1FF',
          100: '#C7DCFF',
          200: '#94B8FF',
          300: '#5A8FFF',
          400: '#2E6FFF',
          500: '#165DFF',
          600: '#0E4AD9',
          700: '#0A3AA6',
          800: '#072A73',
          900: '#041A40',
        },
        'warning': {
          50: '#FFF3E8',
          100: '#FFDCC0',
          200: '#FFBE85',
          300: '#FF9F4A',
          400: '#FF851A',
          500: '#FF7D00',
          600: '#E06B00',
          700: '#B35400',
          800: '#803C00',
          900: '#4D2400',
        },
        'success': {
          50: '#E8FFF0',
          100: '#C0FFD6',
          200: '#85FFAD',
          300: '#4AFF85',
          400: '#1AFF5E',
          500: '#00B42A',
          600: '#009922',
          700: '#007D1B',
          800: '#006114',
          900: '#003D0D',
        },
        'conveyor': {
          100: '#F0F0F0',
          200: '#D9D9D9',
          300: '#BFBFBF',
          400: '#8C8C8C',
          500: '#595959',
          600: '#404040',
          700: '#262626',
          800: '#1A1A1A',
          900: '#0D0D0D',
        }
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'monospace'],
        'sans': ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
        'slide-in': 'slideIn 0.3s ease-out',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        shake: {
          '10%, 90%': { transform: 'translateX(-1px)' },
          '20%, 80%': { transform: 'translateX(2px)' },
          '30%, 50%, 70%': { transform: 'translateX(-4px)' },
          '40%, 60%': { transform: 'translateX(4px)' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(22, 93, 255, 0.5)' },
          '100%': { boxShadow: '0 0 20px rgba(22, 93, 255, 0.8)' },
        },
      },
    },
  },
  plugins: [],
};
