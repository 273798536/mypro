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
        'ocean': {
          50: '#e6f4f8',
          100: '#b3dde9',
          200: '#80c6da',
          300: '#4dafcb',
          400: '#1a98bc',
          500: '#0A2540',
          600: '#081e33',
          700: '#061726',
          800: '#04101a',
          900: '#02080d',
        },
        'teal-glow': {
          400: '#00e5b8',
          500: '#00D4AA',
          600: '#00b894',
        },
        'risk': {
          high: '#FF4D4D',
          medium: '#FFB020',
          low: '#00D4AA',
        },
        'data-status': {
          available: '#00D4AA',
          pending: '#FFB020',
          recollect: '#FF4D4D',
        },
      },
      fontFamily: {
        'display': ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        'mono': ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': "linear-gradient(rgba(0, 212, 170, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 212, 170, 0.03) 1px, transparent 1px)",
        'radar-glow': 'radial-gradient(ellipse at center, rgba(0, 212, 170, 0.1) 0%, transparent 70%)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'pulse-fast': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ripple': 'ripple 2s ease-out infinite',
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'slide-in-right': 'slideInRight 0.3s ease-out forwards',
      },
      keyframes: {
        ripple: {
          '0%': { transform: 'scale(0.8)', opacity: '1' },
          '100%': { transform: 'scale(2)', opacity: '0' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
