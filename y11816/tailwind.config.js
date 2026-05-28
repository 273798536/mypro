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
          50: "#FDF8EE",
          100: "#F9ECCB",
          200: "#F3D98F",
          300: "#EDC553",
          400: "#E8A838",
          500: "#D48D1A",
          600: "#A86E12",
          700: "#7C510D",
          800: "#503509",
          900: "#241804",
        },
        ink: {
          50: "#F5F5F7",
          100: "#E8E8ED",
          200: "#C9C9D4",
          300: "#9A9AAF",
          400: "#6B6B8A",
          500: "#3D3D65",
          600: "#2A2A47",
          700: "#1A1A2E",
          800: "#121220",
          900: "#0A0A12",
        },
        accent: {
          danger: "#E74C3C",
          success: "#2ECC71",
          warning: "#F39C12",
          info: "#3498DB",
        },
      },
      fontFamily: {
        display: ["'Noto Serif SC'", "serif"],
        body: ["'Noto Sans SC'", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
