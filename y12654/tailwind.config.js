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
          50: '#E8EEF3',
          100: '#C9D6E2',
          200: '#9BB4C8',
          300: '#6B8FAD',
          400: '#4C7597',
          500: '#3A6EA5',
          600: '#2E5884',
          700: '#234263',
          800: '#172C42',
          900: '#0C1621',
        },
        surface: {
          50: '#F4F6F7',
          100: '#E5E9EC',
          200: '#CCD4DA',
          300: '#AAB6C0',
          400: '#7E8E9B',
          500: '#556573',
          600: '#3D4954',
          700: '#2C363E',
          800: '#1F2A33',
          900: '#12191F',
        },
        warning: {
          400: '#E4B54A',
          500: '#D4A017',
          600: '#A88012',
        },
        danger: {
          400: '#CD6A62',
          500: '#B84A3F',
          600: '#933B32',
        },
        success: {
          400: '#579872',
          500: '#3E7B58',
          600: '#316246',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['"Noto Sans SC"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'sm': '2px',
        DEFAULT: '2px',
        'md': '3px',
        'lg': '4px',
      },
      boxShadow: {
        'subtle': '0 1px 2px 0 rgba(0, 0, 0, 0.15)',
        'panel': '0 2px 8px 0 rgba(0, 0, 0, 0.2)',
      },
    },
  },
  plugins: [],
};
