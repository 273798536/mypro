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
        lab: {
          primary: "#1E3A5F",
          primaryLight: "#2C5282",
          primaryDark: "#152A45",
          success: "#2D8659",
          successLight: "#48BB78",
          warning: "#E8A838",
          warningLight: "#F6AD55",
          danger: "#C0392B",
          dangerLight: "#FC8181",
          bg: "#F7F9FC",
          panel: "#FFFFFF",
          border: "#E2E8F0",
          text: "#1A202C",
          textLight: "#718096",
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', "serif"],
        mono: ['"JetBrains Mono"', "monospace"],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: "0 2px 8px rgba(30, 58, 95, 0.06), 0 1px 3px rgba(30, 58, 95, 0.04)",
        cardHover: "0 8px 24px rgba(30, 58, 95, 0.10), 0 2px 6px rgba(30, 58, 95, 0.06)",
      },
    },
  },
  plugins: [],
};
