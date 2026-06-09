/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'industrial-blue': '#1E3A8A',
        'tech-gray': '#1F2937',
        'collision-red': '#DC2626',
        'warning-amber': '#F59E0B',
        'boundary-orange': '#EA580C',
        'valid-green': '#059669',
        'review-yellow': '#D97706'
      },
      fontFamily: {
        sans: ['"Source Han Sans"', '"Noto Sans SC"', 'system-ui', 'sans-serif']
      }
    },
  },
  plugins: [],
}
