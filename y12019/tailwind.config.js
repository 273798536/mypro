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
        steel: {
          50: "#E8EDF1",
          100: "#C5D1DB",
          200: "#8FA5B9",
          300: "#5A7A95",
          400: "#3A5E7B",
          500: "#1B3A4B",
          600: "#162F3D",
          700: "#112431",
          800: "#0C1925",
          900: "#070E17",
        },
        amber: {
          400: "#E8C66A",
          500: "#D4A843",
          600: "#B8902E",
        },
        surface: {
          DEFAULT: "#F5F5F0",
          card: "#FFFFFF",
        },
        danger: {
          DEFAULT: "#C0392B",
          light: "#F5D5D2",
        },
      },
      fontFamily: {
        mono: ["JetBrains Mono", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
