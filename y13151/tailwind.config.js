/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0B2545',
        warning: '#D97706',
        danger: '#DC2626',
        success: '#059669',
        ink: '#0F172A',
        paper: '#F8FAFC',
        muted: '#94A3B8',
        accent: '#2563EB',
        moss: '#059669',
        coral: '#DC2626',
        amber: '#D97706',
        gray: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'ui-serif', 'Georgia'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular'],
        sans: ['Inter', 'system-ui'],
      },
      boxShadow: {
        subtle: '0 1px 2px rgba(15,23,42,0.06), 0 1px 3px rgba(15,23,42,0.04)',
        glow: '0 0 0 1px rgba(37,99,235,0.08), 0 8px 24px -6px rgba(37,99,235,0.25)',
      },
    },
  },
  plugins: [],
}
