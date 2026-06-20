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
        root: 'var(--bg-root)',
        surface: 'var(--bg-surface)',
        elevated: 'var(--bg-elevated)',
        hover: 'var(--bg-hover)',
        amber: {
          DEFAULT: 'var(--accent-amber)',
          glow: 'var(--accent-amber-glow)'
        },
        emerald: {
          DEFAULT: 'var(--accent-emerald)',
          glow: 'var(--accent-emerald-glow)'
        },
        danger: {
          DEFAULT: 'var(--accent-red)',
          glow: 'var(--accent-red-glow)'
        },
        info: {
          DEFAULT: 'var(--accent-blue)',
          glow: 'var(--accent-blue-glow)'
        },
        border: {
          DEFAULT: 'var(--border-default)',
          emphasis: 'var(--border-emphasis)'
        }
      },
      textColor: {
        primary: 'var(--text-primary)',
        secondary: 'var(--text-secondary)',
        muted: 'var(--text-muted)'
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        'xl': '14px',
        '2xl': '18px'
      },
      transitionTimingFunction: {
        'out-smooth': 'cubic-bezier(0.16, 1, 0.3, 1)'
      },
      animation: {
        'pulse-amber': 'pulseAmber 3s ease-in-out infinite',
        'stagger-in': 'staggerIn 0.5s cubic-bezier(0.16,1,0.3,1) both',
        'shimmer': 'shimmer 2.5s linear infinite'
      }
    },
  },
  plugins: [],
};
