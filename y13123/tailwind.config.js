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
          950: "#0F2318",
          900: "#1B4332",
          800: "#2D6A4F",
          700: "#40916C",
        },
        ochre: {
          900: "#8B3A2A",
          700: "#C8553D",
          500: "#E07A5F",
          300: "#F2A68A",
          100: "#FBE3D6",
        },
        paper: {
          50: "#FBF8F0",
          100: "#F7F3E9",
          200: "#EFE7D3",
          300: "#E4D7B6",
        },
        gold: {
          900: "#7A5A34",
          700: "#B08968",
          500: "#C9A27B",
        },
        slateData: {
          700: "#495057",
          500: "#6C757D",
          300: "#ADB5BD",
        },
      },
      fontFamily: {
        serif: [
          '"Noto Serif SC"',
          '"Source Han Serif SC"',
          '"Songti SC"',
          "SimSun",
          "serif",
        ],
        mono: [
          '"JetBrains Mono"',
          '"Fira Code"',
          '"SF Mono"',
          "Menlo",
          "monospace",
        ],
        sans: [
          '"PingFang SC"',
          '"Hiragino Sans GB"',
          '"Microsoft YaHei"',
          "system-ui",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 2px 8px rgba(27, 67, 50, 0.08), 0 1px 2px rgba(27, 67, 50, 0.06)",
        cardHover:
          "0 6px 20px rgba(27, 67, 50, 0.12), 0 2px 6px rgba(27, 67, 50, 0.08)",
        inset: "inset 0 1px 2px rgba(27,67,50,0.06)",
      },
      keyframes: {
        pulseRing: {
          "0%": { transform: "scale(1)", opacity: "1" },
          "100%": { transform: "scale(1.6)", opacity: "0" },
        },
        flashHighlight: {
          "0%, 100%": { backgroundColor: "transparent" },
          "25%, 75%": { backgroundColor: "rgba(200,85,61,0.18)" },
          "50%": { backgroundColor: "rgba(200,85,61,0.32)" },
        },
        fadeSlideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeSlideLeft: {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        fadeSlideRight: {
          "0%": { opacity: "0", transform: "translateX(12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        popIn: {
          "0%": { transform: "scale(0)", opacity: "0" },
          "70%": { transform: "scale(1.15)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        diffGlow: {
          "0%,100%": { boxShadow: "0 0 0 rgba(176,137,104,0)" },
          "50%": { boxShadow: "0 0 18px rgba(176,137,104,0.55)" },
        },
        rotateSlow: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        pulseRing: "pulseRing 1.8s cubic-bezier(0.4,0,0.6,1) infinite",
        flashHighlight: "flashHighlight 1.2s ease-in-out 2",
        fadeSlideUp: "fadeSlideUp 0.45s ease-out both",
        fadeSlideLeft: "fadeSlideLeft 0.45s ease-out both",
        fadeSlideRight: "fadeSlideRight 0.45s ease-out both",
        popIn: "popIn 0.4s cubic-bezier(0.34,1.56,0.64,1) both",
        diffGlow: "diffGlow 2.4s ease-in-out infinite",
        rotateSlow: "rotateSlow 1s linear infinite",
      },
    },
  },
  plugins: [],
};
