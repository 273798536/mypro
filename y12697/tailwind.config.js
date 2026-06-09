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
        industrial: {
          50: "#f0f5fa",
          100: "#dbe7f2",
          200: "#b8cee5",
          300: "#8aadce",
          400: "#5a86b3",
          500: "#3c6796",
          600: "#2d5079",
          700: "#253f60",
          800: "#1e3a5f",
          900: "#183051",
          950: "#0e1f38",
        },
        charcoal: {
          50: "#f7f8f9",
          100: "#eef0f2",
          200: "#d6dadf",
          300: "#b1b8c2",
          400: "#8690a0",
          500: "#677284",
          600: "#525b6b",
          700: "#434a57",
          800: "#393f4a",
          900: "#1f2937",
          950: "#111827",
        },
        alert: {
          orange: "#f97316",
          red: "#ef4444",
          green: "#10b981",
          yellow: "#f59e0b",
          blue: "#3b82f6",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['"Noto Sans SC"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'industrial': '0 4px 20px -2px rgba(30, 58, 95, 0.3)',
        'glow-orange': '0 0 20px rgba(249, 115, 22, 0.3)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'fade-in': 'fadeIn 0.4s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
