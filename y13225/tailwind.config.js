/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: '#1a1a2e',
        surface: '#22223a',
        surfaceLight: '#2a2a48',
        amber: '#e8a838',
        amberDark: '#c78a20',
        ivory: '#f5f0e8',
        ivoryMuted: '#a09e96',
        coral: '#e85d50',
        sage: '#6b9e6b',
        mist: '#7ba7bc',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'serif'],
        sans: ['"Noto Sans SC"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
