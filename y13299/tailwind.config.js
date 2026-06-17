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
        primary: '#1f4d3a',
        accent: '#e87d3e',
        'bg-paper': '#faf7f2',
        warning: '#f5c518',
        'text-dark': '#2b2b2b',
      },
      fontFamily: {
        serif: ['"Source Serif Pro"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      animation: {
        fadeIn: 'fadeIn 0.4s ease-in-out',
        slideIn: 'slideIn 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideIn: {
          '0%': { transform: 'translateY(-8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
