/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'navy-deep': '#0B2545',
        'navy-mid': '#13315C',
        'navy-light': '#1B4965',
        'cyan-industrial': '#1B9AAA',
        'cyan-glow': '#06D6A0',
        'orange-alert': '#FF6B35',
        'orange-glow': '#FF8C42',
        'green-pass': '#2EC4B6',
        'gray-wait': '#8D99AE',
        'gray-panel': '#1a2a3a',
        'gray-border': '#2d4a5f',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Courier New', 'monospace'],
        sans: ['Noto Sans SC', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 12px rgba(27, 154, 170, 0.6)',
        'glow-orange': '0 0 12px rgba(255, 107, 53, 0.6)',
        'glow-green': '0 0 12px rgba(46, 196, 182, 0.6)',
      },
      animation: {
        'pulse-slow': 'pulse 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'scanline': 'scanline 8s linear infinite',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
    },
  },
  plugins: [],
}
