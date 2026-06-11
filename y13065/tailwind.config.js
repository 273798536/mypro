/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': {
          DEFAULT: '#0F3B4A',
          light: '#1E5A6E',
          dark: '#082631'
        },
        'accent': {
          warning: '#D97706',
          pass: '#059669',
          danger: '#DC2626',
          pending: '#6B7280'
        },
        'canvas': {
          bg: '#E0F2FE',
          grid: '#B8D4E8'
        }
      },
      fontFamily: {
        'serif-cn': ['"Noto Serif SC"', '"Source Han Serif SC"', 'serif'],
        'mono-cn': ['"JetBrains Mono"', '"Source Code Pro"', 'monospace']
      },
      borderRadius: {
        'engineer': '4px'
      }
    },
  },
  plugins: [],
}
