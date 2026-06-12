/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'academic-navy': '#1e2a5a',
        'academic-navy-deep': '#151d42',
        'academic-paper': '#f5f1e8',
        'academic-paper-dark': '#ebe5d5',
        'success-ink': '#2d6a4f',
        'success-ink-light': '#52b788',
        'late-ochre': '#c46a1b',
        'late-ochre-light': '#f4a261',
        'abnormal-brick': '#a4161a',
        'abnormal-brick-light': '#e5383b',
        'diff-gold': '#ffe66d',
        'diff-gold-deep': '#f4d35e',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      animation: {
        'pulse-ring': 'pulse-ring 1.8s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'slide-up': 'slide-up 0.4s ease-out',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(0.85)', opacity: '0.9' },
          '80%, 100%': { transform: 'scale(1.6)', opacity: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
