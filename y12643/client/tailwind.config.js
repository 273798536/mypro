/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        status: {
          normal: '#22c55e',
          pending: '#eab308',
          abnormal: '#ef4444',
          offline: '#f97316',
          processing: '#3b82f6'
        }
      }
    },
  },
  plugins: [],
}
