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
        municipal: {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1D4ED8",
          800: "#1E40AF",
          900: "#1E3A8A",
          950: "#172554",
        },
        warning: {
          50: "#FFF7ED",
          100: "#FFEDD5",
          500: "#F97316",
          600: "#EA580C",
          700: "#C2410C",
        },
        danger: {
          50: "#FEF2F2",
          100: "#FEE2E2",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
        },
        success: {
          50: "#F0FDF4",
          100: "#DCFCE7",
          500: "#22C55E",
          600: "#16A34A",
          700: "#15803D",
        },
        complaint: {
          50: "#FAF5FF",
          100: "#F3E8FF",
          500: "#A855F7",
          600: "#9333EA",
          700: "#7E22CE",
        },
      },
      fontFamily: {
        sans: ['"Source Han Sans CN"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
        serif: ['"Source Han Serif CN"', '"Noto Serif SC"', 'Georgia', 'serif'],
      },
      backgroundImage: {
        'striped-danger': "repeating-linear-gradient(45deg, rgba(220, 38, 38, 0.1) 0px, rgba(220, 38, 38, 0.1) 10px, transparent 10px, transparent 20px)",
      },
      animation: {
        'pulse-border': 'pulse-border 2s ease-in-out 2',
      },
      keyframes: {
        'pulse-border': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(220, 38, 38, 0.4)' },
          '50%': { boxShadow: '0 0 0 6px rgba(220, 38, 38, 0)' },
        },
      },
    },
  },
  plugins: [],
};
