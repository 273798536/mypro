/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'golf-dark': '#071A1E',
        'golf-teal': '#0D7377',
        'golf-green': '#32E0C4',
        'golf-accent': '#14FFEC',
        'golf-warn': '#FFC93C',
        'golf-error': '#FF6B6B',
        'golf-critical': '#FF3D3D'
      },
      fontFamily: {
        display: ['Montserrat', 'sans-serif'],
        body: ['Inter', 'sans-serif']
      }
    },
  },
  plugins: [],
}
