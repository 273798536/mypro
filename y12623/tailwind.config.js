/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        industrial: {
          50: '#f0f4fa',
          100: '#dae4f0',
          200: '#b8c9e1',
          300: '#8aa6cb',
          400: '#557db0',
          500: '#2f5a94',
          600: '#1e40af',
          700: '#1e3a8a',
          800: '#1e3a6b',
          900: '#1a2f4a',
          950: '#0f1a2b',
        },
        warning: {
          500: '#d97706',
          600: '#b45309',
        },
        success: {
          500: '#059669',
          600: '#047857',
        },
        danger: {
          500: '#dc2626',
          600: '#b91c1c',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-once': 'pulseOnce 0.6s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseOnce: {
          '0%, 100%': { backgroundColor: 'transparent' },
          '50%': { backgroundColor: 'rgba(217, 119, 6, 0.2)' },
        },
      },
    },
  },
  plugins: [],
};
