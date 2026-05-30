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
        'space-bg': '#0a1628',
        'space-panel': '#0f2744',
        'space-border': '#1e3a5f',
        'space-accent': '#4a90d9',
        'space-hover': '#1a3658',
        'axis-pitch': '#ff4d4f',
        'axis-yaw': '#52c41a',
        'axis-roll': '#1890ff',
        'warning-gimbal': '#ff4d4f',
        'warning-range': '#fa8c16',
        'warning-reverse': '#eb2f96',
        'warning-missing': '#faad14',
        'warning-late': '#13c2c2',
        'status-ok': '#52c41a',
      },
      fontFamily: {
        orbitron: ['Orbitron', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'xs-mono': ['10px', { fontFamily: 'JetBrains Mono, monospace', lineHeight: '14px' }],
        'sm-mono': ['11px', { fontFamily: 'JetBrains Mono, monospace', lineHeight: '16px' }],
        'base-mono': ['13px', { fontFamily: 'JetBrains Mono, monospace', lineHeight: '20px' }],
      },
    },
  },
  plugins: [],
};
