/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        graphite: {
          950: '#0a0c0f',
          900: '#0e1116',
          850: '#12161c',
          800: '#171c24',
          750: '#1c222b',
          700: '#222a35',
          600: '#2d3744',
          500: '#3a4654',
        },
        steel: {
          400: '#6b8cae',
          500: '#4d7aa8',
          600: '#3a5d88',
        },
        amberx: {
          400: '#f5a623',
          500: '#e0911a',
        },
        pass: '#3dd68c',
        fail: '#ff5c5c',
        warn: '#f5a623',
      },
      fontFamily: {
        display: ['Oswald', 'sans-serif'],
        sans: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        panel: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 0 0 1px rgba(0,0,0,0.4)',
        glow: '0 0 0 1px rgba(245,166,35,0.35), 0 0 24px -6px rgba(245,166,35,0.45)',
      },
      keyframes: {
        slidein: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        drawerin: {
          '0%': { transform: 'translateX(24px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        pulsebar: {
          '0%,100%': { opacity: '0.55' },
          '50%': { opacity: '1' },
        },
      },
      animation: {
        slidein: 'slidein 0.35s ease-out both',
        drawerin: 'drawerin 0.28s cubic-bezier(0.22,1,0.36,1) both',
        pulsebar: 'pulsebar 2.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
