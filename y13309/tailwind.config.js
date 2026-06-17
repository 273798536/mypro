/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F4F1EA',
        paper2: '#EFEAE0',
        card: '#FBF9F4',
        ink: '#1B1A17',
        ink2: '#5C564E',
        ink3: '#8A8278',
        line: '#DAD3C6',
        line2: '#C9C0AE',
        teal: '#2D5A4F',
        teal2: '#244A41',
        tealsoft: '#E3ECE9',
        bad: '#B33A3A',
        badsoft: '#F3E4E2',
        warn: '#B07A1F',
        warnsoft: '#F4EAD6',
        good: '#3F6B4E',
        goodsoft: '#E5EEE7',
      },
      fontFamily: {
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"Hanken Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 0 rgba(27,26,23,0.04), 0 10px 30px -20px rgba(27,26,23,0.25)',
        pop: '0 18px 50px -24px rgba(27,26,23,0.35)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'grow-w': {
          '0%': { transform: 'scaleY(0)' },
          '100%': { transform: 'scaleY(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.45s cubic-bezier(0.2,0.7,0.2,1) both',
        'slide-in': 'slide-in 0.32s cubic-bezier(0.2,0.7,0.2,1) both',
        'grow-w': 'grow-w 0.4s ease-out both',
      },
    },
  },
  plugins: [],
}
