/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'lab-primary': '#1e40af',
        'lab-secondary': '#0891b2',
        'lab-accent': '#f59e0b',
        'lab-danger': '#dc2626',
        'lab-success': '#16a34a',
        'lab-warn': '#d97706',
      }
    },
  },
  plugins: [],
}
