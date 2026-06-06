/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'port-deep': '#0A4D8C',
        'port-dark': '#0D3B66',
        'port-industrial': '#2C3E50',
        'port-warning': '#E67E22',
        'port-success': '#27AE60',
        'port-danger': '#E74C3C',
        'port-bg': '#0F172A',
        'port-panel': '#1E293B',
        'port-border': '#334155',
      },
      fontFamily: {
        'mono': ['JetBrains Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
