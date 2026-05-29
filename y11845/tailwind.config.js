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
        display: ['"Playfair Display"', '"Noto Sans SC"', 'serif'],
        sans: ['"Noto Sans SC"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      colors: {
        navy: {
          950: '#0F172A',
          900: '#1E293B',
          800: '#1e293b',
        },
      },
    },
  },
  plugins: [],
};
