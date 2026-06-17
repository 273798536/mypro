/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
        },
        status: {
          approved: 'var(--status-approved)',
          review: 'var(--status-review)',
          rerun: 'var(--status-rerun)',
        },
        border: 'var(--border-color)',
        accent: 'var(--accent)',
      },
      fontFamily: {
        mono: ['var(--mono-font)'],
      },
    },
  },
  plugins: [],
}
