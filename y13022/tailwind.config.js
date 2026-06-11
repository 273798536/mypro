/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#0A0D11',
          900: '#0F1419',
          800: '#151B23',
          700: '#1E2630',
          600: '#2A3441',
          500: '#3A4553',
          400: '#5A6776',
          300: '#8794A5',
          200: '#B4BFCB',
          100: '#D7DEE6',
        },
        amber: {
          gold: '#D4A853',
          glow: '#E8C77A',
        },
        status: {
          confirmed: '#10B981',
          pending: '#F59E0B',
          returned: '#EF4444',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'inner-status': 'inset 0 1px 2px rgba(0,0,0,0.3)',
        'glow-amber': '0 0 12px rgba(212,168,83,0.4)',
      },
      animation: {
        'fade-in-stagger': 'fadeIn 0.4s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
