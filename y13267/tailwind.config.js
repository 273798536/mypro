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
          50: "#E6EDF7",
          100: "#C2D1EC",
          200: "#8FA9D9",
          300: "#5C82C6",
          400: "#2E5AAE",
          500: "#1A3F85",
          600: "#0B1E3F",
          700: "#081530",
          800: "#050D20",
          900: "#020610",
        },
        amberwarm: {
          50: "#FFF5EB",
          100: "#FFE2C2",
          200: "#FFCB8F",
          300: "#FFB35C",
          400: "#FF9F33",
          500: "#FF8C42",
          600: "#E67330",
          700: "#B35924",
          800: "#804019",
          900: "#4D260F",
        },
        slategray: {
          50: "#F8FAFC",
          100: "#F1F5F9",
          200: "#E2E8F0",
          300: "#CBD5E1",
          400: "#94A3B8",
          500: "#64748B",
          600: "#475569",
          700: "#334155",
          800: "#1E293B",
          900: "#0F172A",
        },
        mint: {
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
        },
        magenta: {
          400: "#F472B6",
          500: "#EC4899",
          600: "#DB2777",
        },
      },
      fontFamily: {
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', "sans-serif"],
        serif: ['"Noto Serif SC"', '"Songti SC"', '"SimSun"', "serif"],
        mono: ['"JetBrains Mono"', '"Fira Code"', "Consolas", "monospace"],
      },
      boxShadow: {
        glow: "0 0 20px rgba(255, 140, 66, 0.4)",
        "glow-magenta": "0 0 20px rgba(236, 72, 153, 0.4)",
        "glow-mint": "0 0 20px rgba(16, 185, 129, 0.3)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "pulse-fast": "pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
