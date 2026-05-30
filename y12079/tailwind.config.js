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
        'bg-primary': '#0a1628',
        'bg-secondary': '#1e3a5f',
        'bg-tertiary': '#0f2744',
        'accent-blue': '#00d4ff',
        'accent-cyan': '#00f5d4',
        'risk-low': '#2ed573',
        'risk-medium': '#ffa502',
        'risk-high': '#ff6b35',
        'risk-critical': '#ff4757',
        'text-primary': '#ffffff',
        'text-secondary': '#a0b4c8',
        'text-muted': '#6b8a9a',
        'border-glow': 'rgba(0, 212, 255, 0.3)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['IBM Plex Sans', 'sans-serif'],
      },
      boxShadow: {
        'glow': '0 0 20px rgba(0, 212, 255, 0.3)',
        'glow-red': '0 0 20px rgba(255, 71, 87, 0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        glow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
};
