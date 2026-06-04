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
          DEFAULT: '#165DFF',
          dark: '#0E42D2',
          light: '#4080FF'
        },
        warning: {
          DEFAULT: '#FF7D00',
          dark: '#D25F00',
          light: '#FF9A2E'
        },
        danger: {
          DEFAULT: '#F53F3F',
          dark: '#CB2634',
          light: '#FF7875'
        },
        success: {
          DEFAULT: '#00B42A',
          dark: '#009A29',
          light: '#23C343'
        },
        dark: {
          50: '#F7F8FA',
          100: '#E5E6EB',
          200: '#C9CDD4',
          300: '#86909C',
          400: '#4E5969',
          500: '#272E3B',
          600: '#1D2129',
          700: '#000000'
        }
      },
      fontFamily: {
        sans: ['Noto Sans SC', 'system-ui', 'sans-serif'],
      },
      animation: {
        'flip': 'flip 0.6s ease-in-out',
        'float': 'float 3s ease-in-out infinite',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        flip: {
          '0%': { transform: 'perspective(1000px) rotateY(0deg)' },
          '50%': { transform: 'perspective(1000px) rotateY(90deg)' },
          '100%': { transform: 'perspective(1000px) rotateY(0deg)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        }
      }
    },
  },
  plugins: [],
}
