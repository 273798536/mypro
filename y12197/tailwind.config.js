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
        navy: '#0A2463',
        alert: '#E63946',
        amber: '#F4A261',
        forest: '#2A9D8F',
        cream: '#F8F4E3',
        charcoal: '#264653',
        muted: '#6D6875',
        pale: '#E9E3E6',
        edited: '#E7F0FF',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
