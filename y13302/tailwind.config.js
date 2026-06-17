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
        navy: {
          50: "#f0f4f9",
          100: "#d9e3ef",
          200: "#b3c7df",
          300: "#7c9cc6",
          400: "#4d75a8",
          500: "#2f5a8f",
          600: "#1e3a5f",
          700: "#1a3150",
          800: "#172a43",
          900: "#142439",
        },
        amber: {
          50: "#fef7ec",
          100: "#fcecd4",
          200: "#f8d5a4",
          300: "#f3b868",
          400: "#ee9a3d",
          500: "#e8922d",
          600: "#c9751c",
          700: "#a55b18",
        },
        moss: {
          50: "#f0f6f3",
          100: "#d9e8df",
          200: "#b3d0bf",
          300: "#84b094",
          400: "#5a8f6f",
          500: "#3f7d58",
          600: "#2f6345",
          700: "#264f38",
        },
        crimson: {
          50: "#fdf1f0",
          100: "#fbdddb",
          200: "#f7bdb9",
          300: "#ee8f89",
          400: "#e05f57",
          500: "#c8423a",
          600: "#a8332d",
          700: "#8c2a25",
        },
        slate: {
          25: "#fafbfc",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', '"Source Han Sans SC"', '"PingFang SC"', '"Hiragino Sans GB"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: "0 2px 8px -2px rgba(30, 58, 95, 0.08), 0 1px 4px -2px rgba(30, 58, 95, 0.06)",
        "card-hover": "0 8px 24px -6px rgba(30, 58, 95, 0.15), 0 4px 10px -4px rgba(30, 58, 95, 0.1)",
        inset: "inset 0 1px 2px 0 rgba(30, 58, 95, 0.06)",
      },
      keyframes: {
        "pulse-soft": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.75" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.4s ease-out both",
        "slide-in": "slide-in 0.3s ease-out both",
      },
    },
  },
  plugins: [],
};
