/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'cold': {
          bg: '#0F172A',
          panel: '#111827',
          border: '#1E293B',
          primary: '#1E3A5F',
          primaryLight: '#2563EB',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          accent: '#06B6D4',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['"Noto Sans SC"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'inner-glow': 'inset 0 0 20px rgba(6, 182, 212, 0.08)',
        'danger-pulse': '0 0 12px rgba(239, 68, 68, 0.6)',
      },
      keyframes: {
        'pulse-ring': {
          '0%': { transform: 'scale(1)', opacity: '1' },
          '100%': { transform: 'scale(1.8)', opacity: '0' },
        },
        'cold-flow': {
          '0%': { transform: 'translateY(10%)', opacity: '0' },
          '50%': { opacity: '0.4' },
          '100%': { transform: 'translateY(-90%)', opacity: '0' },
        },
        'blink-tag': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        'pulse-ring': 'pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite',
        'cold-flow': 'cold-flow 4s linear infinite',
        'blink-tag': 'blink-tag 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
