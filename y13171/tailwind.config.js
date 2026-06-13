/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: '#1B3A4B',
        'navy-light': '#2A5568',
        orange: '#E8722A',
        'orange-light': '#F09858',
        'orange-dark': '#C55D1E',
        steel: '#6B7B8D',
        surface: '#F0F2F5',
        'surface-dark': '#E2E6EB',
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
