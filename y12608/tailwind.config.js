/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E8F3FF',
          100: '#B9D8FF',
          200: '#8ABFFF',
          300: '#5BA6FF',
          400: '#2C8DFF',
          500: '#165DFF',
          600: '#0E42CC',
          700: '#0A2E99',
          800: '#061F66',
          900: '#031033',
        },
        status: {
          normal: '#00B42A',
          abnormal: '#FF7D00',
          pending: '#FFC53D',
          error: '#F53F3F',
        }
      },
      fontFamily: {
        sans: ['Noto Sans SC', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
