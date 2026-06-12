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
        'ocean': {
          50: '#F0F7FF',
          100: '#DCEAFD',
          200: '#B9D4FA',
          300: '#8FB7F5',
          400: '#5A91EE',
          500: '#3B82F6',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A',
          950: '#0A2540',
        },
        'channel': {
          bg: '#0A2540',
          panel: '#0F172A',
          card: '#1E293B',
          border: '#334155',
          muted: '#64748B',
          text: '#CBD5E1',
          surface: '#F8FAFC',
        },
        'alert': {
          green: '#10B981',
          orange: '#F59E0B',
          red: '#EF4444',
          blue: '#3B82F6',
        }
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        'card-hover': '0 8px 24px -8px rgba(0, 0, 0, 0.3)',
        'glow-green': '0 0 16px rgba(16, 185, 129, 0.4)',
        'glow-orange': '0 0 16px rgba(245, 158, 11, 0.4)',
        'glow-red': '0 0 16px rgba(239, 68, 68, 0.4)',
        'glow-blue': '0 0 16px rgba(59, 130, 246, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'ripple': 'ripple 2s ease-out infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        ripple: {
          '0%': { transform: 'scale(0.8)', opacity: '0.8' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        }
      },
      backgroundImage: {
        'paper-texture': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='0.7' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100' height='100' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E\")",
      }
    },
  },
  plugins: [],
};
