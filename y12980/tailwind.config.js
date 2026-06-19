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
        slate: {
          950: '#0f172a',
        },
        ledger: {
          bg: '#1e293b',
          panel: '#334155',
          border: '#475569',
          text: '#e2e8f0',
          muted: '#94a3b8',
        },
        status: {
          available: '#10b981',
          review: '#f59e0b',
          unavailable: '#ef4444',
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        sans: ['"Noto Sans SC"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in-up': 'fadeInUp 0.5s ease-out forwards',
        'stagger-1': 'fadeInUp 0.5s ease-out 0.05s forwards',
        'stagger-2': 'fadeInUp 0.5s ease-out 0.1s forwards',
        'stagger-3': 'fadeInUp 0.5s ease-out 0.15s forwards',
        'stagger-4': 'fadeInUp 0.5s ease-out 0.2s forwards',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
};
