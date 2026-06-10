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
        primary: {
          50: "#F0F9FB",
          100: "#DCF1F5",
          200: "#B9E2EA",
          300: "#8CCCD8",
          400: "#55AEC1",
          500: "#3292A8",
          600: "#25758B",
          700: "#1E5E71",
          800: "#1C4D5D",
          900: "#0E4C5C",
          950: "#073440",
        },
        status: {
          pass: "#10B981",
          passBg: "#ECFDF5",
          review: "#F59E0B",
          reviewBg: "#FFFBEB",
          fail: "#EF4444",
          failBg: "#FEF2F2",
        },
      },
      fontFamily: {
        serif: ['"Source Han Serif SC"', '"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Inter"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: "0 1px 3px rgba(14, 76, 92, 0.08), 0 1px 2px rgba(14, 76, 92, 0.06)",
        "card-hover": "0 4px 12px rgba(14, 76, 92, 0.12), 0 2px 4px rgba(14, 76, 92, 0.08)",
      },
    },
  },
  plugins: [],
};
