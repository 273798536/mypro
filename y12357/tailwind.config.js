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
          950: '#0F1114',
          900: '#1A1D21',
          850: '#22262C',
          800: '#2A2F37',
          700: '#3A404B',
          600: '#525A68',
          500: '#6B7484',
          400: '#8A94A6',
          300: '#AFB9C9',
          200: '#D4DBE6',
          100: '#EBEFF5',
          50: '#F7F9FC',
        },
        tech: {
          600: '#2563EB',
          500: '#3B82F6',
          400: '#60A5FA',
          300: '#93C5FD',
        },
        alert: {
          red: '#EF4444',
          orange: '#F97316',
          yellow: '#F59E0B',
          green: '#10B981',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'border-pulse': 'borderPulse 2s ease-in-out infinite',
        'spin-slow': 'spin 8s linear infinite',
      },
      keyframes: {
        borderPulse: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(239, 68, 68, 0.4), inset 0 0 0 2px rgba(239, 68, 68, 0.8)' },
          '50%': { boxShadow: '0 0 0 8px rgba(239, 68, 68, 0), inset 0 0 0 2px rgba(239, 68, 68, 0.4)' },
        },
      },
    },
  },
  plugins: [],
};
