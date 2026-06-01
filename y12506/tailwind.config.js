/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'spectrum-low': '#1a1a2e',
        'spectrum-mid': '#16213e',
        'spectrum-high': '#0f3460',
        'spectrum-accent': '#e94560',
        'anomaly-warning': '#fbbf24',
        'anomaly-error': '#ef4444',
        'anomaly-info': '#3b82f6'
      }
    },
  },
  plugins: [],
}
