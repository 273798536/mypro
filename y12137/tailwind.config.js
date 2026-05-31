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
        primary: '#1e3a5f',
        primaryDark: '#0f1f33',
        primaryLight: '#2a5080',
        accent: '#00d4ff',
        accentDark: '#0099cc',
        warning: '#ff6b6b',
        warningLight: '#ff8787',
        success: '#51cf66',
        warningYellow: '#fcc419',
      },
    },
  },
  plugins: [],
};
