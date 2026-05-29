/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'traffic-blue': '#165DFF',
        'warning-orange': '#FF7D00',
        'safe-green': '#00B42A',
        'passenger-red': '#F53F3F',
        'info-gray': '#86909C',
      },
    },
  },
  plugins: [],
}
