/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Noto Sans SC', 'sans-serif'],
      },
      colors: {
        surface: {
          bg: '#060a14',
          panel: '#0a0e1a',
          card: '#0d1520',
          border: '#1a2a3a',
        },
        accent: {
          cyan: '#00e5c8',
          amber: '#f5a623',
        },
      },
    },
  },
  plugins: [],
};
