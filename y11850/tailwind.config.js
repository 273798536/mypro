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
        'deep-ocean': '#0F172A',
        'ocean-light': '#1E293B',
        'sun-orange': '#F97316',
        'sun-glow': '#FDBA74',
        'dawn-gold': '#EAB308',
        'mint-green': '#10B981',
        'coral-red': '#EF4444',
        'steel-blue': '#3B82F6',
      },
      fontFamily: {
        display: ['"Archivo Black"', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(249, 115, 22, 0.5)' },
          '100%': { boxShadow: '0 0 40px rgba(249, 115, 22, 0.8)' },
        },
      },
    },
  },
  plugins: [],
};
