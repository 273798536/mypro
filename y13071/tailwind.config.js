/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        mine: {
          950: "#050E1E",
          900: "#0B1F3A",
          800: "#122B4D",
          700: "#1A3A63",
          600: "#244C7C",
        },
        cable: {
          500: "#FF6B35",
          400: "#FF8A5E",
          300: "#FFA882",
        },
        silver: {
          400: "#9FB3C8",
          300: "#B8CCE0",
          200: "#D1E0F0",
        },
        pass: {
          500: "#2EC4B6",
          400: "#5ED4C9",
        },
        fix: {
          500: "#FFD166",
          400: "#FFDF8F",
        },
        revoke: {
          500: "#6C757D",
          400: "#8A939B",
        },
      },
      fontFamily: {
        display: ['"Space Grotesk"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "ui-monospace", "monospace"],
      },
      boxShadow: {
        "glow-cable": "0 0 12px rgba(255, 107, 53, 0.55)",
        "glow-pass": "0 0 10px rgba(46, 196, 182, 0.45)",
        "inset-scan": "inset 0 0 40px rgba(255, 107, 53, 0.08)",
      },
      animation: {
        "pulse-slow": "pulse 2.6s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "scan-line": "scan 6s linear infinite",
        "float-up": "floatUp 0.35s ease-out",
      },
      keyframes: {
        scan: {
          "0%": { transform: "translateY(-100%)" },
          "100%": { transform: "translateY(100%)" },
        },
        floatUp: {
          "0%": { opacity: 0, transform: "translateY(6px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
