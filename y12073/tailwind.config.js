/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        surface: {
          bg: '#0a0a0f',
          fg: '#e8e6e1',
          amber: '#d4a853',
          coral: '#e05555',
          emerald: '#2ebd6e',
        },
      },
      fontFamily: {
        display: ['Cormorant Garamond', 'serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
