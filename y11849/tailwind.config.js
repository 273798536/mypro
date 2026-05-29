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
        space: {
          dark: "#0a0a1a",
          deeper: "#050510",
          blue: "#0a0a1a",
          purple: "#4a1a6b",
          cyan: "#00d4ff",
          pink: "#ff00aa",
          orange: "#ff6b00",
          green: "#00ff88",
          red: "#ff3366",
          yellow: "#ffff00",
        },
      },
      fontFamily: {
        orbitron: ["Orbitron", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      boxShadow: {
        "neon-cyan": "0 0 5px #00d4ff, 0 0 10px #00d4ff, 0 0 20px #00d4ff",
        "neon-pink": "0 0 5px #ff00aa, 0 0 10px #ff00aa, 0 0 20px #ff00aa",
        "neon-green": "0 0 5px #00ff88, 0 0 10px #00ff88, 0 0 20px #00ff88",
        "neon-orange": "0 0 5px #ff6b00, 0 0 10px #ff6b00, 0 0 20px #ff6b00",
        "neon-purple": "0 0 5px #4a1a6b, 0 0 10px #4a1a6b, 0 0 20px #4a1a6b",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "glow-cyan": "glow-cyan 2s ease-in-out infinite alternate",
        "glow-pink": "glow-pink 2s ease-in-out infinite alternate",
        "float": "float 6s ease-in-out infinite",
        "spin-slow": "spin 20s linear infinite",
        "shake": "shake 0.5s ease-in-out",
      },
      keyframes: {
        "glow-cyan": {
          "0%": { boxShadow: "0 0 5px #00d4ff, 0 0 10px #00d4ff" },
          "100%": { boxShadow: "0 0 10px #00d4ff, 0 0 20px #00d4ff, 0 0 30px #00d4ff" },
        },
        "glow-pink": {
          "0%": { boxShadow: "0 0 5px #ff00aa, 0 0 10px #ff00aa" },
          "100%": { boxShadow: "0 0 10px #ff00aa, 0 0 20px #ff00aa, 0 0 30px #ff00aa" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "shake": {
          "0%, 100%": { transform: "translateX(0)" },
          "25%": { transform: "translateX(-5px)" },
          "75%": { transform: "translateX(5px)" },
        },
      },
    },
  },
  plugins: [],
};
