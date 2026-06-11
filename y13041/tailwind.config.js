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
        deepsea: {
          50: "#eef3f9",
          100: "#d5e2ef",
          200: "#abc3df",
          300: "#779ccb",
          400: "#4b74b4",
          500: "#2f5799",
          600: "#1f4279",
          700: "#183460",
          800: "#0F2A4A",
          900: "#0a1d35",
          950: "#06111f",
        },
        amber: {
          50: "#fbf6ea",
          100: "#f5e8c5",
          200: "#ecd08b",
          300: "#e3b452",
          400: "#D4A24C",
          500: "#c28a2d",
          600: "#a66d23",
          700: "#855221",
          800: "#6d4322",
          900: "#5c381f",
        },
        slatefinance: {
          50: "#F5F6FA",
          100: "#e6e8ef",
          200: "#ccd1df",
          300: "#a3aac3",
          400: "#747da0",
          500: "#555d83",
          600: "#424868",
          700: "#363a54",
          800: "#1a1a2e",
          900: "#0f0f1c",
        },
      },
      fontFamily: {
        serif: ['"Lora"', 'Georgia', 'Cambria', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      animation: {
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in-up': 'fadeInUp 0.4s ease-out both',
        'slide-in-right': 'slideInRight 0.3s ease-out both',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
    },
  },
  plugins: [],
};
