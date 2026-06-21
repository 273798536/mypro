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
        ink: {
          950: "#0B1220",
          900: "#0F172A",
          800: "#1E293B",
          700: "#334155",
          600: "#475569",
          500: "#64748B",
        },
        signal: {
          amber: "#F59E0B",
          amberSoft: "#FDE68A",
          green: "#10B981",
          greenSoft: "#6EE7B7",
          red: "#EF4444",
          redSoft: "#FCA5A5",
          cyan: "#38BDF8",
          cyanSoft: "#7DD3FC",
          violet: "#8B5CF6",
          violetSoft: "#C4B5FD",
          slate: "#94A3B8",
        },
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
        sans: [
          "Noto Sans SC",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(56, 189, 248, 0.15), 0 8px 32px rgba(56, 189, 248, 0.08)",
        card: "0 1px 0 0 rgba(148, 163, 184, 0.08), 0 1px 3px rgba(0,0,0,0.3)",
      },
      backgroundImage: {
        "noise-overlay":
          "radial-gradient(circle at 20% 10%, rgba(56,189,248,0.08), transparent 40%), radial-gradient(circle at 80% 80%, rgba(139,92,246,0.06), transparent 40%)",
        "card-shimmer":
          "linear-gradient(135deg, rgba(56,189,248,0.04) 0%, transparent 50%, rgba(139,92,246,0.04) 100%)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
