/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'marine': {
          50: '#f1f7fc',
          100: '#e0ecf6',
          200: '#c5d9ec',
          300: '#9bbedc',
          400: '#669bc7',
          500: '#3b82f6',
          600: '#2a68d4',
          700: '#1e3a5f',
          800: '#152a45',
          900: '#0f1e31',
        },
        'rust': {
          500: '#f59e0b',
          600: '#d97706',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['"Noto Sans SC"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'engineering': '0 1px 0 0 rgba(30,58,95,0.08), 0 1px 3px 0 rgba(15,30,49,0.08)',
        'engineering-hover': '0 2px 0 0 rgba(30,58,95,0.12), 0 4px 12px -2px rgba(15,30,49,0.15)',
      },
      animation: {
        'breath': 'breath 2s ease-in-out infinite',
        'draw-line': 'drawLine 0.8s ease-out forwards',
        'stagger-fade': 'staggerFade 0.5s ease-out forwards',
      },
      keyframes: {
        breath: {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        drawLine: {
          '0%': { strokeDashoffset: '100%' },
          '100%': { strokeDashoffset: '0%' },
        },
        staggerFade: {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
