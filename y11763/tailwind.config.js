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
        'chamber': {
          950: '#0a1628',
          900: '#0f2137',
          800: '#1a2f4a',
          700: '#253d5d',
        },
        'particle': {
          electron: '#10b981',
          proton: '#ef4444',
          neutron: '#f59e0b',
          muon: '#8b5cf6',
          pion: '#3b82f6',
          kaon: '#ec4899',
        }
      },
      fontFamily: {
        'orbitron': ['Orbitron', 'sans-serif'],
        'jetbrains': ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { opacity: '0.5', boxShadow: '0 0 5px currentColor' },
          '50%': { opacity: '1', boxShadow: '0 0 20px currentColor' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        }
      }
    },
  },
  plugins: [],
};
