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
        'space-deep': '#0a1628',
        'space-dark': '#0f1e36',
        'space-mid': '#1a2d4a',
        'cyber-cyan': '#00e5ff',
        'cyber-cyan-dim': '#00a3b8',
        'alert-orange': '#ff6b35',
        'success-green': '#00ff88',
        'warn-yellow': '#ffd93d',
      },
      fontFamily: {
        'display': ['Orbitron', 'monospace'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'scan-line': 'scanLine 3s linear infinite',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0,229,255,0.5), 0 0 20px rgba(0,229,255,0.2)' },
          '50%': { boxShadow: '0 0 15px rgba(0,229,255,0.8), 0 0 40px rgba(0,229,255,0.4)' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      clipPath: {
        'chamfer': 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px))',
      },
    },
  },
  plugins: [],
};
