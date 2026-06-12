/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        abyss: {
          900: '#050D1A',
          800: '#0A1628',
          700: '#112240',
          600: '#1A3258',
          500: '#234278',
        },
        neon: {
          cyan: '#00E5FF',
          cyanDim: '#00A8C2',
          amber: '#FFB020',
          amberDim: '#C78512',
          magenta: '#FF2D87',
          magentaDim: '#C71E68',
          green: '#34D399',
          greenDim: '#22A06F',
        },
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        sans: ['Noto Sans SC', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        'neon-cyan': '0 0 12px rgba(0,229,255,0.35), 0 0 4px rgba(0,229,255,0.6)',
        'neon-amber': '0 0 12px rgba(255,176,32,0.35), 0 0 4px rgba(255,176,32,0.6)',
        'neon-magenta': '0 0 12px rgba(255,45,135,0.35), 0 0 4px rgba(255,45,135,0.6)',
        'glass': '0 8px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      backgroundImage: {
        'wave-grid':
          "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160' viewBox='0 0 160 160'><g fill='none' stroke='%230f2847' stroke-width='0.6'><path d='M0 40 Q40 28 80 40 T160 40'/><path d='M0 80 Q40 68 80 80 T160 80'/><path d='M0 120 Q40 108 80 120 T160 120'/></g><g stroke='%230d2038' stroke-width='0.4'><path d='M40 0 V160M80 0 V160M120 0 V160M0 40 H160M0 80 H160M0 120 H160'/></g></svg>\")",
        'radial-abyss':
          'radial-gradient(1200px 700px at 50% -10%, rgba(0,229,255,0.08), transparent 60%), radial-gradient(900px 600px at 100% 110%, rgba(255,45,135,0.06), transparent 60%)',
      },
      animation: {
        'breath-amber': 'breathAmber 2.4s ease-in-out 3',
        'pulse-edge': 'pulseEdge 2.2s ease-in-out infinite',
        'slide-down': 'slideDown 320ms cubic-bezier(.2,.8,.2,1)',
        'stagger-fade': 'staggerFade 500ms ease-out both',
      },
      keyframes: {
        breathAmber: {
          '0%,100%': { boxShadow: '0 0 0 0 rgba(255,176,32,0.0)' },
          '50%': { boxShadow: '0 0 0 8px rgba(255,176,32,0.25), 0 0 20px rgba(255,176,32,0.4)' },
        },
        pulseEdge: {
          '0%,100%': { boxShadow: '0 0 0 1px rgba(0,229,255,0.18), 0 0 8px rgba(0,229,255,0.15)' },
          '50%': { boxShadow: '0 0 0 1px rgba(0,229,255,0.6), 0 0 18px rgba(0,229,255,0.35)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-14px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
        staggerFade: {
          '0%': { transform: 'translateY(8px)', opacity: 0 },
          '100%': { transform: 'translateY(0)', opacity: 1 },
        },
      },
    },
  },
  plugins: [],
};
