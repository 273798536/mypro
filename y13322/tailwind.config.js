/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: {
          50: '#FAF7EF',
          100: '#F4EFE3',
          200: '#ECE4D2',
          300: '#E0D5BB',
          400: '#CBBFA0',
        },
        ink: {
          900: '#1A1814',
          700: '#3A352C',
          500: '#6B6354',
          400: '#8C8472',
        },
        dossier: {
          DEFAULT: '#28415B',
          600: '#1F3346',
          400: '#3C5878',
        },
        forensic: '#B23A48',
        forensicDark: '#8C2A36',
        verified: '#2F6B4F',
        amber: {
          DEFAULT: '#C8862E',
          dark: '#A06A1F',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', 'serif'],
        sans: ['"Noto Sans SC"', '"Source Han Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontWeight: {
        400: '400',
        500: '500',
        600: '600',
        700: '700',
        900: '900',
      },
      boxShadow: {
        stamp: '0 1px 0 rgba(26,24,20,0.08), 0 0 0 1px rgba(26,24,20,0.06)',
        card: '0 1px 2px rgba(26,24,20,0.06), 0 8px 24px -12px rgba(26,24,20,0.18)',
        inset: 'inset 0 0 0 1px rgba(26,24,20,0.08)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'stamp-in': {
          '0%': { opacity: '0', transform: 'scale(0.9) rotate(-6deg)' },
          '60%': { opacity: '1' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(-3deg)' },
        },
        'pulse-soft': {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease both',
        'stamp-in': 'stamp-in 0.4s ease both',
        'pulse-soft': 'pulse-soft 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
