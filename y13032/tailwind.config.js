/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#E8ECF2',
          100: '#C5CFDF',
          200: '#9FB1CA',
          300: '#6E88AD',
          400: '#436090',
          500: '#2A436E',
          600: '#1A2E4F',
          700: '#0B2545',
          800: '#071A32',
          900: '#04101F',
        },
        amber: {
          DEFAULT: '#E8833A',
          light: '#F5B783',
          dark: '#B8631F',
        },
        emerald: {
          DEFAULT: '#2E933C',
          light: '#6BC478',
          dark: '#1F6A2A',
        },
        cream: '#F7F4EE',
        paper: '#FBFAF6',
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(11,37,69,0.08), 0 4px 12px rgba(11,37,69,0.05)',
        'card-hover': '0 4px 12px rgba(11,37,69,0.12), 0 8px 24px rgba(11,37,69,0.08)',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s ease-out forwards',
        'pulse-border': 'pulseBorder 1.2s ease-in-out 3',
        'spin-check': 'spinCheck 0.4s ease-out forwards',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseBorder: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(232,131,58,0.45)' },
          '50%': { boxShadow: '0 0 0 6px rgba(232,131,58,0)' },
        },
        spinCheck: {
          '0%': { transform: 'scale(0) rotate(-180deg)', opacity: '0' },
          '100%': { transform: 'scale(1) rotate(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
