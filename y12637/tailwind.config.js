/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'stratum-dark': '#2D3436',
        'stratum-mid': '#636E72',
        'stratum-alert': '#E17055',
        'stratum-bg': '#F5F6FA',
        'stratum-success': '#00B894',
        'stratum-warning': '#FDCB6E'
      },
      fontFamily: {
        sans: ['"Source Han Sans CN"', '"PingFang SC"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      }
    },
  },
  plugins: [],
}
