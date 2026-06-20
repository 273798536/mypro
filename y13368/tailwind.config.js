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
        base: {
          900: '#1a1a2e',
          800: '#16213e',
          700: '#0f3460',
          600: '#1a1a3e',
          500: '#252547',
        },
        amber: {
          primary: '#f0a500',
          light: '#ffc947',
          dark: '#c78500',
        },
        danger: '#e94560',
        success: '#0f9d58',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        sans: ['Noto Sans SC', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
