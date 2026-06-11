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
          900: '#0f1d33',
          800: '#1e3a5f',
          700: '#2c5282',
        },
        warn: '#e67e22',
        danger: '#c0392b',
        success: '#27ae60',
        muted: '#7f8c8d',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', 'serif'],
        sans: ['"Noto Sans SC"', '"Source Han Sans SC"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
