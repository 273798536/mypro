/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        ocean: {
          50: '#F0F7FA',
          100: '#D6E8EF',
          200: '#A9D0DE',
          300: '#73B0C6',
          400: '#3E8AA7',
          500: '#1F6B88',
          600: '#0B3D5B',
          700: '#082E45',
          800: '#062234',
          900: '#041825',
        },
        alert: {
          DEFAULT: '#E5484D',
          light: '#FDE8E9',
          dark: '#B83237',
        },
        tealish: {
          DEFAULT: '#2DD4BF',
          light: '#CCFBF1',
          dark: '#0D9488',
        },
        caution: {
          DEFAULT: '#F5B544',
          light: '#FEF3C7',
          dark: '#D97706',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      animation: {
        'pulse-fast': 'pulse 1.2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'draw-line': 'drawLine 600ms ease-out forwards',
        'blink-3': 'blink3 1.2s ease-in-out',
      },
      keyframes: {
        drawLine: {
          '0%': { strokeDashoffset: '2000' },
          '100%': { strokeDashoffset: '0' },
        },
        blink3: {
          '0%, 100%': { opacity: '1' },
          '25%, 75%': { opacity: '0.2' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
