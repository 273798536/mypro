/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'engineer': {
          50: '#f0f4f9',
          100: '#dbe5f0',
          200: '#b7cce0',
          300: '#89aacb',
          400: '#5482b1',
          500: '#346498',
          600: '#254e7c',
          700: '#1e3a5f',
          800: '#1a3150',
          900: '#182a44',
        },
        'warn': {
          500: '#d97706',
          600: '#b45309',
        },
        'success': {
          500: '#059669',
          600: '#047857',
        },
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'ui-monospace', 'monospace'],
        'sans': ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
