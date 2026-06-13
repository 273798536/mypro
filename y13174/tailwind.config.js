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
        'steel-blue': '#1e3a5f',
        'steel-gray': '#4a5568',
        'pass-green': '#2f855a',
        'noise-amber': '#d69e2e',
        'extreme-red': '#c53030',
        'confirm-indigo': '#5a67d8',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Noto Sans SC', 'sans-serif'],
      },
      borderRadius: {
        'none': '0px',
      },
    },
  },
  plugins: [],
};
