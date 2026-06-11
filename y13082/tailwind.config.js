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
          bg: "#0F172A",
          panel: "#1E293B",
          border: "#334155",
          muted: "#64748B",
          text: "#E2E8F0",
        },
        alert: {
          orange: "#F97316",
          orangeLight: "#FDBA74",
          orangeDark: "#C2410C",
          red: "#EF4444",
          yellow: "#F59E0B",
          green: "#10B981",
          indigo: "#6366F1",
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
        sans: ['"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'inner-industrial': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.3)',
      },
    },
  },
  plugins: [],
};
