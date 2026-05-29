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
        'cold-chain': {
          primary: '#165DFF',
          danger: '#F53F3F',
          warning: '#FF7D00',
          success: '#00B42A',
          frozen: '#2B2A66',
          chilled: '#0E5D8C',
          normal: '#5C5C5C',
          dark: '#0F172A',
          panel: '#1E293B',
          border: '#334155',
        }
      },
      fontFamily: {
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shake': 'shake 0.5s ease-in-out',
        'glow-success': 'glow-success 0.6s ease-out',
        'glow-danger': 'glow-danger 0.6s ease-out',
        'slide-in': 'slide-in 0.3s ease-out',
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        'glow-success': {
          '0%': { boxShadow: '0 0 0 0 rgba(0, 180, 42, 0.7)' },
          '100%': { boxShadow: '0 0 0 12px rgba(0, 180, 42, 0)' },
        },
        'glow-danger': {
          '0%': { boxShadow: '0 0 0 0 rgba(245, 63, 63, 0.7)' },
          '100%': { boxShadow: '0 0 0 12px rgba(245, 63, 63, 0)' },
        },
        'slide-in': {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
