/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'deep-sea': '#0A3D62',
        'deep-sea-dark': '#062A44',
        'sea-mist': '#E8EEF2',
        'sea-mist-dark': '#CAD7DF',
        'alert-orange': '#F39C12',
        'withdrawn-gray': '#7F8C8D',
        'manual-purple': '#8E44AD',
        'processed-green': '#27AE60',
        'suspended-red': '#C0392B',
      },
      fontFamily: {
        'serif-cn': ['"Noto Serif SC"', '"Source Han Serif SC"', 'Georgia', 'serif'],
        'sans-cn': ['"Noto Sans SC"', '"Source Han Sans SC"', 'system-ui', 'sans-serif'],
        'mono-data': ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
