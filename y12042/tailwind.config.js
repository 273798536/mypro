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
        'circuit-bg': '#0a1628',
        'circuit-dark': '#06101e',
        'circuit-card': '#0f1f35',
        'circuit-border': '#1a3050',
        'power-blue': '#4da6ff',
        'power-blue-glow': 'rgba(77, 166, 255, 0.6)',
        'success-green': '#00ff88',
        'success-green-glow': 'rgba(0, 255, 136, 0.6)',
        'warning-amber': '#ff6b35',
        'warning-amber-glow': 'rgba(255, 107, 53, 0.6)',
        'danger-red': '#ff3366',
        'danger-red-glow': 'rgba(255, 51, 102, 0.6)',
        'text-primary': '#e6f1ff',
        'text-secondary': '#7a9dc7',
        'text-muted': '#4a6b95',
      },
      fontFamily: {
        display: ['Orbitron', 'monospace'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'neon-blue': '0 0 10px rgba(77, 166, 255, 0.5), 0 0 20px rgba(77, 166, 255, 0.3)',
        'neon-green': '0 0 10px rgba(0, 255, 136, 0.5), 0 0 20px rgba(0, 255, 136, 0.3)',
        'neon-amber': '0 0 10px rgba(255, 107, 53, 0.5), 0 0 20px rgba(255, 107, 53, 0.3)',
        'neon-red': '0 0 10px rgba(255, 51, 102, 0.5), 0 0 20px rgba(255, 51, 102, 0.3)',
        'inner-glow': 'inset 0 0 20px rgba(77, 166, 255, 0.1)',
      },
      animation: {
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'scan-line': 'scanLine 3s linear infinite',
        'current-flow': 'currentFlow 1.5s linear infinite',
        'short-diffuse': 'shortDiffuse 0.5s ease-out',
        'spark': 'spark 0.3s ease-out',
      },
      keyframes: {
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        currentFlow: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        shortDiffuse: {
          '0%': { transform: 'scale(0.5)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        spark: {
          '0%': { transform: 'scale(0)', opacity: '1' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
