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
        navy: {
          50: '#E8EDF3',
          100: '#C5D1E3',
          200: '#8FA3C7',
          300: '#5975AB',
          400: '#3A5889',
          500: '#1B3A5C',
          600: '#162E4A',
          700: '#112238',
          800: '#0C1726',
          900: '#070B14',
        },
        amber: {
          DEFAULT: '#E5A100',
          light: '#F5C342',
          dark: '#B88000',
        },
        margin: {
          green: '#22C55E',
          yellow: '#EAB308',
          red: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
};
