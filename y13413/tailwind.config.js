/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "1.5rem",
    },
    extend: {
      colors: {
        parchment: {
          50: "#fbf8f0",
          100: "#f5f0e1",
          200: "#ece3c8",
          300: "#e0d2a5",
          400: "#cdb97d",
          500: "#b99e58",
          600: "#a18344",
          700: "#846837",
          800: "#6c5531",
          900: "#5a472c",
        },
        ink: {
          50: "#f2f5fa",
          100: "#dde6f2",
          200: "#b5c8e1",
          300: "#83a4cb",
          400: "#507db2",
          500: "#2f5d94",
          600: "#1e3a5f",
          700: "#1a3250",
          800: "#172a42",
          900: "#142438",
        },
        vermilion: {
          50: "#fdf2f0",
          100: "#fbded7",
          200: "#f7b9ac",
          300: "#f08b76",
          400: "#e55a3e",
          500: "#c0392b",
          600: "#a82e22",
          700: "#8d251d",
          800: "#75211c",
          900: "#621f1d",
        },
        charcoal: {
          50: "#f5f5f5",
          100: "#e6e6e6",
          200: "#cccccc",
          300: "#a8a8a8",
          400: "#737373",
          500: "#4a4a4a",
          600: "#2c2c2c",
          700: "#1f1f1f",
          800: "#141414",
          900: "#0a0a0a",
        },
      },
      fontFamily: {
        serif: ['"Source Serif Pro"', '"Noto Serif SC"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', '"SF Mono"', '"Menlo"', 'monospace'],
        sans: ['"Inter"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'parchment': '0 1px 3px rgba(90, 71, 44, 0.08), 0 4px 12px rgba(90, 71, 44, 0.06)',
        'parchment-lg': '0 4px 12px rgba(90, 71, 44, 0.1), 0 16px 40px rgba(90, 71, 44, 0.08)',
        'ink': '0 1px 3px rgba(30, 58, 95, 0.12), 0 4px 12px rgba(30, 58, 95, 0.1)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(24px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.65' },
        },
        'count-up': {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out both',
        'fade-in-stagger': 'fade-in 0.4s ease-out both',
        'slide-in-right': 'slide-in-right 0.35s ease-out both',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
      },
      backgroundImage: {
        'paper-texture': "radial-gradient(ellipse at 20% 20%, rgba(185, 158, 88, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(30, 58, 95, 0.04) 0%, transparent 50%)",
      },
    },
  },
  plugins: [],
};
