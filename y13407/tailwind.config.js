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
        ink: {
          50: "#F4F7FB",
          100: "#E5ECF5",
          200: "#C5D3E4",
          300: "#98B0CC",
          400: "#5E7FA5",
          500: "#3A5A80",
          600: "#2A4463",
          700: "#1E3A5F",
          800: "#162A46",
          900: "#0E1B2E",
        },
        amber: {
          50: "#FDF4E9",
          100: "#FAE4C7",
          200: "#F4C88E",
          300: "#EEA853",
          400: "#E8833A",
          500: "#C86621",
          600: "#9C4E18",
        },
        mint: {
          50: "#ECF8F2",
          100: "#C9ECD8",
          200: "#94D8B3",
          300: "#5EC18D",
          400: "#3EA77C",
          500: "#2B8561",
          600: "#1F6147",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', "Georgia", "serif"],
        mono: ['"JetBrains Mono"', '"SF Mono"', "Menlo", "monospace"],
      },
      animation: {
        "slide-in-right": "slideInRight 300ms ease-out",
        "fade-in": "fadeIn 200ms ease-out",
        "count-up": "countUp 600ms ease-out",
      },
      keyframes: {
        slideInRight: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        countUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
