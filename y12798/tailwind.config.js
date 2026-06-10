/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1rem",
    },
    extend: {
      colors: {
        lab: {
          50: "#EEF4FB",
          100: "#D6E4F3",
          200: "#AEC9E7",
          300: "#7FA8D7",
          400: "#4E84C4",
          500: "#1E4D8C",
          600: "#183F73",
          700: "#123158",
          800: "#0C223E",
          900: "#061423",
        },
        chem: {
          50: "#EDF8F2",
          100: "#D5EFDF",
          200: "#A9DEBD",
          300: "#74C896",
          400: "#43B171",
          500: "#2D9A6F",
          600: "#247C58",
          700: "#1B5C42",
          800: "#123E2D",
          900: "#092017",
        },
        warn: {
          50: "#FEF5EC",
          100: "#FCE6CF",
          200: "#F8CC9E",
          300: "#F2AB63",
          400: "#ED8E37",
          500: "#E8873A",
          600: "#BC6B2B",
          700: "#8B4F1F",
          800: "#5D3514",
          900: "#2F1A0A",
        },
        alert: {
          50: "#FDECEC",
          100: "#F9D0D0",
          200: "#F2A1A1",
          300: "#EA7272",
          400: "#E14545",
          500: "#D32F2F",
          600: "#AB2525",
          700: "#7F1B1B",
          800: "#541212",
          900: "#2A0909",
        },
        ink: {
          50: "#F7F8FA",
          100: "#ECEEF2",
          200: "#D5D9E2",
          300: "#B0B8C7",
          400: "#7F8AA2",
          500: "#525C75",
          600: "#3C4459",
          700: "#2A3041",
          800: "#1A1F2B",
          900: "#0E111A",
        },
      },
      fontFamily: {
        display: ["'DM Serif Display'", "Georgia", "serif"],
        sans: ["'Noto Sans SC'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 24px -8px rgba(30, 77, 140, 0.18)",
        soft: "0 2px 12px -4px rgba(0, 0, 0, 0.08)",
      },
      borderRadius: {
        xl2: "14px",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
