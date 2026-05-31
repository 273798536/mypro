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
        navy: '#1B2A4A',
        amber: '#D4A843',
        slate_text: '#4A5568',
        emerald: '#38A169',
        coral: '#E53E3E',
        surface: '#F7F8FA',
        card: '#FFFFFF',
        border: '#E2E8F0',
      },
      fontFamily: {
        serif: ['Noto Serif SC', 'serif'],
        sans: ['Noto Sans SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
