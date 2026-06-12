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
          900: '#0f172a',
          800: '#1e3a5f',
          700: '#274972',
          600: '#335a8a',
        },
        amber: {
          600: '#d97706',
          500: '#f59e0b',
        },
        emerald: {
          600: '#059669',
        },
        paper: {
          50: '#fbfaf7',
          100: '#f5f3ed',
          200: '#e8e4d8',
        }
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(15,23,42,0.08), 0 1px 2px rgba(15,23,42,0.06)',
      }
    },
  },
  plugins: [],
}
