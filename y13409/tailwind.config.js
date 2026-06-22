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
        slate: {
          deep: "#1e3a5f",
          darker: "#142947",
          soft: "#2d4a72",
        },
        amber: {
          warm: "#d97706",
          soft: "#fbbf24",
          pale: "#fef3c7",
        },
        teal: {
          jade: "#0d9488",
          soft: "#14b8a6",
          pale: "#ccfbf1",
        },
        ink: {
          50: "#f8fafc",
          100: "#f1f5f9",
          200: "#e2e8f0",
          300: "#cbd5e1",
          500: "#64748b",
          700: "#334155",
          900: "#0f172a",
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', "serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      boxShadow: {
        card: "0 2px 8px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.06)",
        cardHover: "0 8px 24px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(15, 23, 42, 0.08)",
        inset: "inset 0 2px 4px rgba(15, 23, 42, 0.08)",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseHighlight: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(217, 119, 6, 0.5)" },
          "50%": { boxShadow: "0 0 0 8px rgba(217, 119, 6, 0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
      },
      animation: {
        fadeUp: "fadeUp 0.5s ease-out both",
        pulseHighlight: "pulseHighlight 1.5s ease-in-out 3",
        slideInRight: "slideInRight 0.3s ease-out both",
      },
    },
  },
  plugins: [],
};
