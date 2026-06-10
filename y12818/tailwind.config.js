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
        "scientific-blue": {
          50: "#EFF6FF",
          100: "#DBEAFE",
          200: "#BFDBFE",
          300: "#93C5FD",
          400: "#60A5FA",
          500: "#3B82F6",
          600: "#2563EB",
          700: "#1E40AF",
          800: "#1E3A8A",
          900: "#1E3A8A",
          950: "#172554",
          DEFAULT: "#1E40AF",
        },
        "amber-warning": {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#FBBF24",
          500: "#F59E0B",
          600: "#D97706",
          700: "#B45309",
          800: "#92400E",
          900: "#78350F",
          950: "#451A03",
          DEFAULT: "#F59E0B",
        },
        "emerald-success": {
          50: "#ECFDF5",
          100: "#D1FAE5",
          200: "#A7F3D0",
          300: "#6EE7B7",
          400: "#34D399",
          500: "#10B981",
          600: "#059669",
          700: "#047857",
          800: "#065F46",
          900: "#064E3B",
          950: "#022C22",
          DEFAULT: "#059669",
        },
        "danger-red": {
          50: "#FEF2F2",
          100: "#FEE2E2",
          200: "#FECACA",
          300: "#FCA5A5",
          400: "#F87171",
          500: "#EF4444",
          600: "#DC2626",
          700: "#B91C1C",
          800: "#991B1B",
          900: "#7F1D1D",
          950: "#450A0A",
          DEFAULT: "#DC2626",
        },
      },
      fontFamily: {
        serif: [
          '"Source Han Serif SC"',
          '"Noto Serif SC"',
          '"思源宋体"',
          '"SimSun"',
          "ui-serif",
          "Georgia",
          "serif",
        ],
        sans: [
          '"Source Han Sans SC"',
          '"Noto Sans SC"',
          '"思源黑体"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          '"JetBrains Mono"',
          '"Source Code Pro"',
          '"Menlo"',
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
      backgroundImage: {
        "noise-texture":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
        "noise-texture-light":
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix type='matrix' values='1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.08 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E\")",
        "gradient-blue-scientific":
          "linear-gradient(135deg, #1E40AF 0%, #2563EB 50%, #3B82F6 100%)",
        "gradient-card":
          "linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%)",
      },
      boxShadow: {
        "card":
          "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)",
        "card-hover":
          "0 4px 8px rgba(30,64,175,0.08), 0 8px 24px rgba(30,64,175,0.12)",
        "button-primary":
          "inset 0 1px 0 rgba(255,255,255,0.2), 0 1px 2px rgba(30,64,175,0.2)",
        "button-primary-hover":
          "inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 12px rgba(30,64,175,0.3)",
        "drawer":
          "-4px 0 20px rgba(0,0,0,0.08)",
      },
      animation: {
        "pulse-dot": "pulseDot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in-up": "fadeInUp 400ms cubic-bezier(0.4, 0, 0.2, 1) both",
        "fade-in": "fadeIn 300ms ease-out both",
        "slide-in-right": "slideInRight 250ms cubic-bezier(0.4, 0, 0.2, 1) both",
        "slide-in-left": "slideInLeft 250ms cubic-bezier(0.4, 0, 0.2, 1) both",
        "slide-in-down": "slideInDown 250ms cubic-bezier(0.4, 0, 0.2, 1) both",
        "ripple": "ripple 600ms linear",
        "float": "float 3s ease-in-out infinite",
        "shimmer": "shimmer 2s linear infinite",
        "stagger-1": "staggerFade 400ms ease-out 80ms both",
        "stagger-2": "staggerFade 400ms ease-out 160ms both",
        "stagger-3": "staggerFade 400ms ease-out 240ms both",
        "stagger-4": "staggerFade 400ms ease-out 320ms both",
        "stagger-5": "staggerFade 400ms ease-out 400ms both",
        "stagger-6": "staggerFade 400ms ease-out 480ms both",
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(1.2)" },
        },
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideInRight: {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" },
        },
        slideInLeft: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" },
        },
        slideInDown: {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        ripple: {
          "0%": { transform: "scale(0)", opacity: "0.5" },
          "100%": { transform: "scale(4)", opacity: "0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-1000px 0" },
          "100%": { backgroundPosition: "1000px 0" },
        },
        staggerFade: {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
