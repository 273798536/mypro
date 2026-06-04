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
        iron: "#2D2D2D",
        warn: "#E87722",
        pass: "#4CAF50",
        danger: "#D32F2F",
        muted: "#607D8B",
      },
      fontFamily: {
        noto: ['"Noto Sans SC"', "sans-serif"],
      },
    },
  },
  plugins: [],
};
