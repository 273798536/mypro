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
          50: '#EFF6FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
          DEFAULT: '#1E40AF',
        },
        pass: {
          DEFAULT: '#059669',
          light: '#D1FAE5',
        },
        warn: {
          DEFAULT: '#EA580C',
          light: '#FFEDD5',
        },
        fail: {
          DEFAULT: '#DC2626',
          light: '#FEE2E2',
        },
        ink: {
          DEFAULT: '#0F172A',
          muted: '#64748B',
          light: '#E2E8F0',
        },
      },
      fontFamily: {
        serif: ['"Source Han Serif SC"', '"Noto Serif SC"', 'ui-serif', 'serif'],
        sans: ['"Source Han Sans SC"', '"Noto Sans SC"', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};
