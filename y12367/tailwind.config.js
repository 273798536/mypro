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
        industrial: {
          bg: {
            DEFAULT: '#0F172A',
            light: '#1E293B',
            dark: '#020617',
          },
          border: {
            DEFAULT: '#334155',
            light: '#475569',
            dark: '#1E293B',
          },
          text: {
            DEFAULT: '#E2E8F0',
            muted: '#94A3B8',
            dim: '#64748B',
          },
        },
        anomaly: {
          speed: '#3B82F6',
          temp: '#F59E0B',
          power: '#EF4444',
          normal: '#10B981',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
        display: ['Orbitron', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'blink': 'blink 1s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'slide-in': 'slideIn 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.3' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px currentColor' },
          '100%': { boxShadow: '0 0 20px currentColor, 0 0 30px currentColor' },
        },
        slideIn: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      boxShadow: {
        'industrial': '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)',
        'glow-blue': '0 0 10px rgba(59, 130, 246, 0.5)',
        'glow-orange': '0 0 10px rgba(245, 158, 11, 0.5)',
        'glow-red': '0 0 10px rgba(239, 68, 68, 0.5)',
        'glow-green': '0 0 10px rgba(16, 185, 129, 0.5)',
      },
    },
  },
  plugins: [],
};
