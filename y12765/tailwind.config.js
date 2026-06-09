/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#F0FDFA",
          100: "#CCFBF1",
          200: "#99F6E4",
          300: "#5EEAD4",
          400: "#2DD4BF",
          500: "#14B8A6",
          600: "#0D9488",
          700: "#0F766E",
          800: "#115E59",
          900: "#134E4A",
        },
        warn: {
          50:  "#FFFBEB",
          500: "#D97706",
          600: "#B45309",
          700: "#92400E",
        },
        pass: {
          50:  "#ECFDF5",
          500: "#059669",
          600: "#047857",
          700: "#065F46",
        },
        fail: {
          50:  "#FEF2F2",
          500: "#DC2626",
          600: "#B91C1C",
          700: "#991B1B",
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 1px 3px rgba(15, 118, 110, 0.08), 0 1px 2px rgba(15, 118, 110, 0.06)',
        'card': '0 4px 12px rgba(15, 118, 110, 0.08), 0 2px 4px rgba(15, 118, 110, 0.06)',
        'hover': '0 6px 20px rgba(15, 118, 110, 0.12), 0 2px 6px rgba(15, 118, 110, 0.08)',
      },
      borderRadius: {
        'lg2': '10px',
      },
    },
  },
  plugins: [],
};
