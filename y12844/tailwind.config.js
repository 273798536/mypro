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
        medical: {
          blue: '#165DFF',
          'blue-dark': '#0E42D2',
          'blue-light': '#E8F3FF',
          success: '#00B42A',
          'success-light': '#E8FFEA',
          warning: '#FF7D00',
          'warning-light': '#FFF3E8',
          danger: '#F53F3F',
          'danger-light': '#FFECE8',
          blocked: '#E63975',
          'blocked-light': '#FFE8F0',
        },
        neutral: {
          50: '#F7F8FA',
          100: '#F2F3F5',
          200: '#E5E6EB',
          300: '#C9CDD4',
          400: '#86909C',
          500: '#4E5969',
          600: '#272E3B',
          700: '#1D2129',
        }
      },
      fontFamily: {
        sans: [
          '"Source Han Sans SC"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'sans-serif'
        ],
        mono: [
          '"JetBrains Mono"',
          '"SF Mono"',
          '"Fira Code"',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace'
        ],
      },
      boxShadow: {
        card: '0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 12px rgba(22, 93, 255, 0.12)',
      }
    },
  },
  plugins: [],
};
