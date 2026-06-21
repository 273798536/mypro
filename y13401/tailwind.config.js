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
          50: "#f5f7fa",
          100: "#e4e9f0",
          200: "#c7d2df",
          300: "#9bb0c5",
          400: "#6988a6",
          500: "#476889",
          600: "#36526e",
          700: "#2c435a",
          800: "#27384c",
          900: "#1e3a5f",
          950: "#13233a",
        },
        parchment: {
          50: "#fdfaf3",
          100: "#f9f3e4",
          200: "#f2e6c8",
          300: "#e9d4a2",
          400: "#debc77",
          500: "#d4a655",
        },
        empty: {
          50: "#f0f4f8",
          100: "#dce6ef",
          200: "#c2d3e3",
          300: "#9db8d1",
        },
        zero: {
          50: "#fff8e6",
          100: "#ffefc2",
          200: "#ffe38f",
          300: "#ffd24d",
        },
        duplicate: {
          50: "#f5f0ff",
          100: "#e9deff",
          200: "#d7c4ff",
          300: "#bd9eff",
        },
        approved: {
          50: "#eefaf2",
          100: "#d5f3df",
          200: "#aee6c0",
          300: "#7ad396",
          400: "#49ba6a",
          500: "#2d9d50",
        },
        review: {
          50: "#fff4eb",
          100: "#ffe5d1",
          200: "#ffc89e",
          300: "#ffa366",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', "Georgia", "serif"],
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', "sans-serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "Consolas", "monospace"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(30, 58, 95, 0.08), 0 1px 2px rgba(30, 58, 95, 0.06)",
        "card-hover": "0 4px 12px rgba(30, 58, 95, 0.12), 0 2px 4px rgba(30, 58, 95, 0.08)",
        soft: "0 2px 8px rgba(30, 58, 95, 0.06)",
      },
      transitionTimingFunction: {
        soft: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};
