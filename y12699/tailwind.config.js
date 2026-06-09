/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'industrial': {
          900: '#0A1628',
          800: '#0F2B46',
          700: '#1A3A5C',
          600: '#2C3E50',
        },
        'alert': {
          orange: '#E67E22',
          red: '#C0392B',
        },
        'pass': {
          green: '#27AE60',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['Noto Sans SC', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'industrial': '2px',
      },
    },
  },
  plugins: [],
}
