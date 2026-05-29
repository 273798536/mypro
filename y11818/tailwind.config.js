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
        charcoal: {
          DEFAULT: '#1A1A2E',
          light: '#252540',
          lighter: '#333355',
        },
        'medical-teal': {
          DEFAULT: '#0F9B8E',
          light: '#14B8A6',
        },
        'warning-orange': {
          DEFAULT: '#E8813B',
          light: '#F59E4B',
        },
        'soft-white': '#F5F5F0',
        border: '#3A3A5C',
        success: '#22C55E',
        danger: '#EF4444',
      },
    },
  },
  plugins: [],
};
