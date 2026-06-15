/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    borderRadius: {
      DEFAULT: "6px",
      sm: "2px",
      md: "6px",
      lg: "8px",
      xl: "12px",
      "2xl": "16px",
      "3xl": "24px",
      full: "9999px",
    },
    extend: {
      colors: {
        night: {
          DEFAULT: "#1B3A5C",
          50: "#E8EEF5",
          100: "#CDD9E8",
          300: "#6E8FB3",
          500: "#1B3A5C",
          700: "#132A42",
          900: "#0B1A2B",
        },
        market: {
          DEFAULT: "#FF6B35",
          50: "#FFEDE5",
          100: "#FFD6C2",
          400: "#FF8C60",
          500: "#FF6B35",
          600: "#F25217",
        },
        status: {
          pending: "#D97706",
          review: "#1D4ED8",
          approved: "#059669",
          supplement: "#DC2626",
          manual: "#7C3AED",
          community: "#0891B2",
        },
      },
      fontFamily: {
        serif: ['"Source Han Serif CN"', '"Noto Serif SC"', "SimSun", "serif"],
        sans: ['"Source Han Sans CN"', '"Noto Sans SC"', '"PingFang SC"', "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        "card": "0 1px 2px rgba(27,58,92,.04), 0 4px 16px rgba(27,58,92,.06), 0 8px 32px rgba(27,58,92,.04)",
      },
    },
  },
  plugins: [],
};
