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
        mono: ["'JetBrains Mono'", "monospace"],
        sans: ["'Noto Sans SC'", "sans-serif"],
      },
      colors: {
        brand: {
          indigo: "#1B2A4A",
          steel: "#4A5568",
          amber: "#E8913A",
        },
      },
    },
  },
  plugins: [],
}
