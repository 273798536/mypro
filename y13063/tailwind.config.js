/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f7f9',
          100: '#d6e9ee',
          200: '#add3dd',
          300: '#7db5c4',
          400: '#4a91a5',
          500: '#2e7488',
          600: '#0F4C5C',
          700: '#0b3a47',
          800: '#082c36',
          900: '#051e25',
        },
        accent: {
          amber: '#E36414',
          rust: '#9A031E',
          moss: '#5F8D4E',
        },
        surface: {
          bg: '#FBF7F4',
          card: '#ffffff',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      animation: {
        'breathe': 'breathe 2s ease-in-out infinite',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { transform: 'scale(1)', opacity: '1' },
          '50%': { transform: 'scale(1.2)', opacity: '0.85' },
        },
      },
    },
  },
  plugins: [],
}
