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
        parchment: '#F5F3EF',
        inkstone: '#2D4739',
        amber: '#C4913B',
        ochre: '#B85450',
        sandstone: '#E8E4DD',
        moss: '#3A5F4B',
        sage: '#6B8F71',
        driftwood: '#8C7B6B',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
