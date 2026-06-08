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
        ocean: {
          950: "#050C18",
          900: "#0A1628",
          800: "#0E1F3A",
          700: "#132B4D",
          600: "#1E3A5F",
          500: "#2A4F7A",
        },
        data: {
          cyan: "#00D4FF",
          green: "#3DDC97",
          orange: "#FF8A3D",
          red: "#FF4D6D",
          purple: "#9D4EDD",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 12px rgba(0, 212, 255, 0.4)',
        'glow-orange': '0 0 12px rgba(255, 138, 61, 0.5)',
        'glow-red': '0 0 16px rgba(255, 77, 109, 0.6)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'ping-slow': 'ping 2.5s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
    },
  },
  plugins: [],
};
