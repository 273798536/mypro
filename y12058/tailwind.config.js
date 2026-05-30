/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        coffee: {
          dark: '#4A2C2A',
          medium: '#6B4423',
          light: '#8B5A2B',
        },
        cream: {
          DEFAULT: '#F5E6D3',
          dark: '#E8D5C4',
        },
        thermal: {
          hot: '#E67E22',
          cold: '#3498DB',
          warning: '#E74C3C',
          success: '#27AE60',
        },
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Source Han Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
