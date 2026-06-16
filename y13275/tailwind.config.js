/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: {
        primary: {
          50: '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#1e3a5f',
          900: '#102a43',
        },
        accent: {
          50: '#fff2ec',
          100: '#ffd9c7',
          200: '#ffb899',
          300: '#ff9266',
          400: '#f46d3d',
          500: '#e85d3c',
          600: '#d94a2a',
          700: '#c23a1e',
          800: '#a22e15',
          900: '#7f2410',
        },
        background: '#f4f6f9',
        surface: '#ffffff',
        'surface-secondary': '#f9fafb',
        text: {
          primary: '#2d3748',
          secondary: '#4a5568',
          muted: '#718096',
        },
        success: '#38a169',
        warning: '#dd6b20',
        danger: '#c53030',
      },
      fontFamily: {
        display: ['"Noto Serif SC"', 'serif'],
        body: ['"Noto Sans SC"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        card: '0 4px 6px -1px rgba(30, 58, 95, 0.1), 0 2px 4px -1px rgba(30, 58, 95, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(30, 58, 95, 0.15), 0 4px 6px -2px rgba(30, 58, 95, 0.08)',
        glow: '0 0 0 3px rgba(232, 93, 60, 0.3)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-4px)' },
          '75%': { transform: 'translateX(4px)' },
        },
        pulseDot: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-20px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'fade-in-stagger': 'fadeIn 0.5s ease-out forwards',
        shake: 'shake 0.5s ease-in-out',
        'pulse-dot': 'pulseDot 1.5s ease-in-out infinite',
        'slide-in': 'slideIn 0.4s ease-out forwards',
      },
    },
  },
  plugins: [],
};
