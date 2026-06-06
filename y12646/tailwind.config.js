/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
      },
    },
    extend: {
      fontFamily: {
        sans: [
          '"Noto Sans SC"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          "system-ui",
          "sans-serif",
        ],
        display: [
          '"Noto Serif SC"',
          '"PingFang SC"',
          "serif",
        ],
        mono: [
          '"JetBrains Mono"',
          '"SF Mono"',
          "monospace",
        ],
      },
      colors: {
        medical: {
          50: "#f0f7ff",
          100: "#e0effe",
          200: "#bae0fd",
          300: "#7cc8fb",
          400: "#36aaf7",
          500: "#0c8ee8",
          600: "#0071c6",
          700: "#015aa1",
          800: "#064d85",
          900: "#0b416e",
          950: "#072949",
        },
        warm: {
          50: "#fdf8f3",
          100: "#f9ede0",
          200: "#f2d7bc",
          300: "#e9ba8c",
          400: "#de9458",
          500: "#d67637",
          600: "#c85f2c",
          700: "#a74826",
          800: "#863b26",
          900: "#6d3222",
        },
        sage: {
          50: "#f4f9f6",
          100: "#e6f1ea",
          200: "#cde3d5",
          300: "#a4ccb3",
          400: "#73ad8a",
          500: "#50916b",
          600: "#3d7655",
          700: "#325e46",
          800: "#2a4c3a",
          900: "#233f31",
        },
        ink: {
          50: "#f6f6f7",
          100: "#e2e3e6",
          200: "#c5c7cd",
          300: "#a0a3ac",
          400: "#7b7f8b",
          500: "#616571",
          600: "#4d505a",
          700: "#3f4149",
          800: "#35363c",
          900: "#1f2024",
          950: "#121316",
        },
      },
      boxShadow: {
        "soft": "0 2px 8px -2px rgba(7, 41, 73, 0.08), 0 1px 3px -1px rgba(7, 41, 73, 0.06)",
        "card": "0 4px 20px -4px rgba(7, 41, 73, 0.12), 0 2px 6px -2px rgba(7, 41, 73, 0.06)",
        "elevated": "0 12px 40px -8px rgba(7, 41, 73, 0.18), 0 4px 12px -4px rgba(7, 41, 73, 0.1)",
      },
      backgroundImage: {
        "grid-med": "linear-gradient(rgba(12, 142, 232, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(12, 142, 232, 0.05) 1px, transparent 1px)",
        "paper": "linear-gradient(135deg, #fdfbf7 0%, #f8f4ec 100%)",
      },
      backgroundSize: {
        "grid-med": "24px 24px",
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
    },
  },
  plugins: [],
};
