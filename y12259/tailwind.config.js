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
          gold: "#D4A843",
          dark: "#0A1F1C",
          deep: "#0f2f2a",
        },
        risk: {
          industry: "#E63946",
          fee: "#F4A261",
          panic: "#7B2D8E",
        },
      },
      animation: {
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
        "slide-in": "slide-in-left 0.3s ease-out forwards",
        "count-up": "count-up 0.5s ease-out forwards",
      },
    },
  },
  plugins: [],
};
