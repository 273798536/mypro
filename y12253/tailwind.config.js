/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'deep-ocean': {
          50: '#e6f7ff',
          100: '#b3e5fc',
          200: '#81d4fa',
          300: '#4fc3f7',
          400: '#29b6f6',
          500: '#03a9f4',
          600: '#039be5',
          700: '#0288d1',
          800: '#0277bd',
          900: '#01579b',
          950: '#0a1628',
        },
        'tech-cyan': {
          400: '#00e5ff',
          500: '#00d4ff',
          600: '#00b8d4',
        },
        'sonar-green': {
          400: '#69f0ae',
          500: '#00ff88',
          600: '#00c853',
        },
        'warning-orange': {
          400: '#ffab40',
          500: '#ff6b35',
          600: '#f4511e',
        },
        'danger-red': {
          400: '#ff5252',
          500: '#ff4757',
          600: '#d50000',
        },
        'reef': {
          rock: '#5d4e37',
          coral: '#ff6b9d',
          debris: '#7a7a7a',
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Orbitron', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'sonar-ring': 'sonarRing 2s ease-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scan-line': 'scanLine 4s linear infinite',
        'float': 'float 3s ease-in-out infinite',
        'beat': 'beat 1s ease-in-out infinite',
      },
      keyframes: {
        sonarRing: {
          '0%': { transform: 'scale(0.1)', opacity: '1' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        glow: {
          '0%': { boxShadow: '0 0 5px currentColor, 0 0 10px currentColor' },
          '100%': { boxShadow: '0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        beat: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
        },
      },
      boxShadow: {
        'glow-cyan': '0 0 10px rgba(0, 212, 255, 0.5), 0 0 20px rgba(0, 212, 255, 0.3)',
        'glow-green': '0 0 10px rgba(0, 255, 136, 0.5), 0 0 20px rgba(0, 255, 136, 0.3)',
        'glow-orange': '0 0 10px rgba(255, 107, 53, 0.5), 0 0 20px rgba(255, 107, 53, 0.3)',
        'glow-red': '0 0 10px rgba(255, 71, 87, 0.5), 0 0 20px rgba(255, 71, 87, 0.3)',
      },
    },
  },
  plugins: [],
};
