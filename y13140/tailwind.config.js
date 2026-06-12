/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          50: '#f5f7fa',
          100: '#e6ebf2',
          200: '#c8d3e2',
          300: '#9aadc7',
          400: '#6682a5',
          500: '#3e5e87',
          600: '#2d4768',
          700: '#1e3a5f',
          800: '#172d4a',
          900: '#0f1f33',
        },
        amber: {
          50: '#fdf8ee',
          100: '#f9ecc9',
          200: '#f2d78e',
          300: '#e9bc54',
          400: '#d4a24c',
          500: '#b8853a',
          600: '#95662d',
        },
        archive: {
          stripe:
            'repeating-linear-gradient(45deg, #f9ecc9, #f9ecc9 8px, #f2d78e 8px, #f2d78e 16px)',
        },
      },
      fontFamily: {
        song: ['"Source Han Serif SC"', '"Noto Serif SC"', 'SimSun', 'serif'],
        hei: ['"Source Han Sans SC"', '"Noto Sans SC"', '"PingFang SC"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
    },
  },
  plugins: [],
}
