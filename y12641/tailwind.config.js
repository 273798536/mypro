/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'deck-primary': '#0F3460',
        'deck-accent': '#E94560',
        'deck-success': '#16C79A',
        'deck-warning': '#FFB830',
        'deck-surface': '#1A1A2E',
        'deck-panel': '#16213E',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
