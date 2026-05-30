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
        parchment: {
          50: '#faf6f0',
          100: '#f0e8d8',
          200: '#e0d0b0',
          300: '#d4b896',
          400: '#c9a070',
          500: '#b8884a',
          600: '#a0703a',
          700: '#805830',
          800: '#604020',
          900: '#402810',
        },
        ink: {
          50: '#f0f0f5',
          100: '#d0d0dd',
          200: '#a0a0b5',
          300: '#707090',
          400: '#505070',
          500: '#353550',
          600: '#2a2a40',
          700: '#222235',
          800: '#1a1a28',
          900: '#12121e',
          950: '#0a0a14',
        },
        amber: {
          DEFAULT: '#d4a574',
          light: '#e8c49a',
          dark: '#b8854e',
          glow: '#d4a57440',
        },
        danger: {
          DEFAULT: '#ef4444',
          light: '#fca5a5',
          dark: '#b91c1c',
        },
        success: {
          DEFAULT: '#22c55e',
          light: '#86efac',
          dark: '#15803d',
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', '"Source Han Serif SC"', 'Georgia', 'serif'],
        sans: ['"Noto Sans SC"', '"Source Han Sans SC"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      animation: {
        'slide-in-right': 'slideInRight 0.4s ease-out',
        'slide-in-up': 'slideInUp 0.3s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
        'fade-in': 'fadeIn 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'flash-red': 'flashRed 0.5s ease-in-out infinite',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideInUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px #d4a57440' },
          '50%': { boxShadow: '0 0 20px #d4a57480' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.9)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        flashRed: {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: '#ef444430' },
        },
      },
    },
  },
  plugins: [],
};
