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
        cyber: {
          900: '#0a0f1e',
          800: '#111827',
          700: '#1a2234',
          600: '#243049',
        },
        neon: {
          cyan: '#00e5ff',
          orange: '#ff9100',
          red: '#ff1744',
          green: '#00e676',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['"Noto Sans SC"', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
