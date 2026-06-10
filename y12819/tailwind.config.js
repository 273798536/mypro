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
        title: ['"Source Serif 4"', 'Georgia', 'serif'],
        body: ['"DM Sans"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
};
