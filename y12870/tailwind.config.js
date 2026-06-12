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
        ocean: {
          50: "#F4F8FC",
          100: "#E0EBF5",
          200: "#C9DAEA",
          500: "#2A6F97",
          700: "#153B5C",
          900: "#0A2540",
          950: "#0B132B",
        },
        status: {
          available: "#0E7C7B",
          "available-soft": "#E6F5F4",
          deferred: "#E9A23B",
          "deferred-soft": "#FDF3E3",
          recollect: "#D64045",
          "recollect-soft": "#FBE7E8",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', "Georgia", "serif"],
        sans: ['"Noto Sans SC"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 4px 12px rgba(10,37,64,0.08)",
        "card-hover": "0 6px 18px rgba(10,37,64,0.15)",
      },
      animation: {
        "fade-in": "fadeIn 0.3s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
