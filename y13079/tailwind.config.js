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
        'dc-bg': '#0B1F3A',
        'dc-bg-2': '#0E2647',
        'dc-panel': '#132D4F',
        'dc-border': '#1E3A5F',
        'dc-cold': '#00D4FF',
        'dc-cold-dim': '#00A8CC',
        'dc-warm': '#FF6B35',
        'dc-anomaly': '#FF9500',
        'dc-error': '#FF3B30',
        'dc-ok': '#34C759',
        'dc-release': '#30D158',
        'dc-supply': '#FF453A',
        'dc-pending': '#FF9F0A',
        'dc-text': '#F8FAFC',
        'dc-text-dim': '#94A3B8',
        'dc-text-mute': '#64748B',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px currentColor, 0 0 10px currentColor' },
          '100%': { boxShadow: '0 0 15px currentColor, 0 0 30px currentColor' },
        },
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
    },
  },
  plugins: [],
};
