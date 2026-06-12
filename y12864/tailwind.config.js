/** @type {import('tailwindcss').Config} */

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        ocean: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#00B4D8',
          600: '#0891b2',
          700: '#0A2540',
          800: '#0c4a6e',
          900: '#082f49'
        },
        coral: {
          50: '#fff1f2',
          100: '#ffe4e6',
          500: '#E63946',
          600: '#dc2626',
        }
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace']
      }
    },
  },
  plugins: [],
};
