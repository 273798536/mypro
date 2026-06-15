/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#F4F6FA',
          100: '#E4E9F2',
          200: '#C6CFE0',
          300: '#98A6C2',
          400: '#65769E',
          500: '#435681',
          600: '#2E426B',
          700: '#1E3A5F',
          800: '#172E4C',
          900: '#0F1F34',
        },
        amber: {
          50: '#FBF6EF',
          100: '#F5E9D6',
          200: '#E9D1AA',
          300: '#DEC08B',
          400: '#D4A574',
          500: '#B88752',
          600: '#8E683D',
        },
        pine: {
          50: '#EFF6F2',
          100: '#D5E8DC',
          200: '#A9D0B8',
          300: '#7EB894',
          400: '#4A8C6E',
          500: '#3A6F57',
          600: '#2C5442',
        },
        rouge: {
          50: '#FBEFEF',
          100: '#F4D4D4',
          200: '#E8A6A6',
          300: '#DC7878',
          400: '#C94A4A',
          500: '#A83C3C',
          600: '#822E2E',
        },
        rattan: {
          50: '#FDF8EB',
          100: '#F8EDC9',
          200: '#F1DB8C',
          300: '#E8C750',
          400: '#E8B931',
          500: '#C79B1F',
          600: '#987615',
        },
      },
      fontFamily: {
        display: ['"Noto Serif SC"', '"Source Han Serif SC"', 'Georgia', 'serif'],
        body: ['"Noto Sans SC"', '"Source Han Sans SC"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 2px 8px -2px rgba(30, 58, 95, 0.08), 0 1px 3px -1px rgba(30, 58, 95, 0.05)',
        pop: '0 12px 32px -8px rgba(30, 58, 95, 0.18), 0 4px 12px -4px rgba(30, 58, 95, 0.10)',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(74, 140, 110, 0.4)' },
          '50%': { boxShadow: '0 0 0 6px rgba(74, 140, 110, 0)' },
        },
        popin: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '60%': { transform: 'scale(1.03)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        slidein: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        breathe: 'breathe 2.4s ease-in-out infinite',
        popin: 'popin 300ms ease-out',
        slidein: 'slidein 220ms ease-out',
      },
    },
  },
  plugins: [],
}
