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
        brand: {
          DEFAULT: '#0F766E',
          light: '#14B8A6',
          dark: '#0D5D56',
          50: '#F0FDFA',
          100: '#CCFBF1',
        },
        surface: {
          DEFAULT: '#F5F5F4',
          alt: '#E7E5E4',
        },
        amber: {
          DEFAULT: '#D97706',
          light: '#FCD34D',
        },
        emerald: {
          DEFAULT: '#059669',
          light: '#6EE7B7',
        },
      },
      fontFamily: {
        serif: ['"Source Serif 4"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
