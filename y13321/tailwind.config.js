/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#FBF9F4',
          100: '#F7F4EE',
          200: '#EFEAE0',
          300: '#E3DCCE',
          400: '#D2C8B4',
        },
        ink: {
          900: '#171511',
          800: '#242019',
          700: '#3A342A',
          600: '#5C5446',
          500: '#7A7060',
          400: '#9A9080',
        },
        change: {
          DEFAULT: '#B45309',
          soft: '#FBE8D0',
          deep: '#7C3A06',
        },
        consistent: {
          DEFAULT: '#15803D',
          soft: '#D7EBDD',
          deep: '#0E5C2C',
        },
        drift: {
          DEFAULT: '#9F1239',
          soft: '#F7D7DF',
          deep: '#7A0E2C',
        },
        pending: {
          DEFAULT: '#A16207',
          soft: '#F5E7C4',
          deep: '#7A4B05',
        },
        manual: {
          DEFAULT: '#0F766E',
          soft: '#C9E8E4',
          deep: '#0B5550',
        },
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['"Schibsted Grotesk"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        xs: '3px',
        sm: '4px',
        md: '6px',
      },
      boxShadow: {
        edge: '0 1px 0 0 rgba(23,21,17,0.06)',
        lift: '0 2px 0 0 rgba(23,21,17,0.05), 0 8px 24px -12px rgba(23,21,17,0.18)',
        inset: 'inset 0 -1px 0 0 rgba(23,21,17,0.06)',
      },
      keyframes: {
        riseIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        drawBar: {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
      },
      animation: {
        rise: 'riseIn 0.5s cubic-bezier(0.22,1,0.36,1) both',
        bar: 'drawBar 0.7s cubic-bezier(0.22,1,0.36,1) both',
      },
    },
  },
  plugins: [],
}
