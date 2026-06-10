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
        teal: {
          950: "#0A2E36",
          900: "#0F4C5C",
          800: "#156477",
          700: "#1B7D93",
          600: "#2896B0",
          500: "#3CAFC9",
        },
        amber: {
          700: "#B85210",
          600: "#E36414",
          500: "#F27A2C",
          400: "#F79E5C",
        },
        warm: {
          50: "#FAF8F5",
          100: "#F3EFE8",
          200: "#E6DED2",
          300: "#D3C6B3",
          400: "#B8A68E",
          500: "#9A866D",
          600: "#7D6B56",
          700: "#635344",
          800: "#4A3E34",
          900: "#332B25",
        },
      },
      fontFamily: {
        serif: ['"Source Han Serif SC"', '"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Source Han Sans SC"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'monospace'],
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
        "number-flip": {
          "0%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)", opacity: "0.5" },
          "100%": { transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.5s ease-out both",
        "pulse-soft": "pulse-soft 1.8s ease-in-out infinite",
        "number-flip": "number-flip 0.3s ease-out",
      },
    },
  },
  plugins: [],
};
