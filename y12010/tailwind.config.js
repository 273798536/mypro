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
        teal: {
          primary: '#0F766E',
          dark: '#0D5F59',
          light: '#14B8A6',
        },
        amber: {
          warn: '#D97706',
          light: '#FCD34D',
        },
      },
      fontFamily: {
        display: ['"DM Sans"', '"Noto Sans SC"', 'sans-serif'],
        body: ['"Noto Sans SC"', '"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
