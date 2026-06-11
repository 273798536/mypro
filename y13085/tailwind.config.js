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
        copper: {
          DEFAULT: "#C9956B",
          50: "#F5EDE5",
          100: "#E8D5C0",
          200: "#D4B898",
          300: "#C9956B",
          400: "#B07D4F",
          500: "#966638",
          600: "#7A4F28",
          700: "#5E3B1C",
          800: "#422812",
          900: "#2A180A",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'serif'],
        sans: ['"Noto Sans SC"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
