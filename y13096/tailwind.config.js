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
        'aero': {
          bg: '#0A1628',
          panel: '#0F2038',
          border: '#1E3A5F',
          line: '#00D4AA',
          warn: '#FF7A45',
          danger: '#FF4D4F',
          track: '#FFD93D',
          text: '#C9E4FF',
          muted: '#6B8BA8',
          dim: '#061224'
        }
      },
      fontFamily: {
        'display': ['Orbitron', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
        'sans': ['"Noto Sans SC"', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        'glow-cyan': '0 0 12px rgba(0,212,170,0.35)',
        'glow-warn': '0 0 12px rgba(255,122,69,0.45)',
        'glow-danger': '0 0 14px rgba(255,77,79,0.55)'
      },
      backgroundImage: {
        'grid-scan': 'repeating-linear-gradient(0deg, rgba(0,212,170,0.06) 0px, rgba(0,212,170,0.06) 1px, transparent 1px, transparent 8px), repeating-linear-gradient(90deg, rgba(0,212,170,0.04) 0px, rgba(0,212,170,0.04) 1px, transparent 1px, transparent 8px)'
      },
      animation: {
        'pulse-ring': 'pulseRing 2s ease-out infinite',
        'scan-sweep': 'scanSweep 3.5s linear infinite'
      },
      keyframes: {
        pulseRing: {
          '0%':   { transform: 'scale(0.6)', opacity: '0.8' },
          '100%': { transform: 'scale(2.2)', opacity: '0' }
        },
        scanSweep: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        }
      }
    },
  },
  plugins: [],
};
