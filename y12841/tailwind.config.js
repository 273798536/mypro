/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        teal: {
          950: '#0D4F4F',
          900: '#0F6B6B',
          800: '#148080',
          700: '#1A9E9E',
        },
        amber: {
          accent: '#D4A843',
          light: '#E8C97A',
          dark: '#B08930',
        },
        slate: {
          lab: '#4A5568',
        },
        ivory: '#FAFAF5',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'serif'],
        sans: ['"Noto Sans SC"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
