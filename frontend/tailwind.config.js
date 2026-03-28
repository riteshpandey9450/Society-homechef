/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Instrument Serif"', 'serif'],
        body:    ['"Plus Jakarta Sans"', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // Orange palette (primary brand)
        orange: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        // Keep saffron for legacy class usage
        saffron: {
          50:  '#fff8ed',
          100: '#ffefd4',
          200: '#ffdba8',
          300: '#ffc170',
          400: '#ff9d37',
          500: '#f97316',
          600: '#ea580c',
          700: '#c74706',
          800: '#9e380c',
          900: '#7f300d',
        },
        forest: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        charcoal: {
          800: '#1a1a2e',
          900: '#0f0f1a',
          950: '#080810',
        },
      },
      animation: {
        'fade-in':       'fadeIn 0.35s ease forwards',
        'slide-up':      'slideUp 0.35s ease forwards',
        'slide-down':    'slideDown 0.25s ease forwards',
        'scale-in':      'scaleIn 0.25s ease forwards',
        'pulse-soft':    'pulseSoft 2s ease-in-out infinite',
        'bounce-gentle': 'bounceGentle 2s ease-in-out infinite',
        'shimmer':       'shimmer 1.6s ease-in-out infinite',
        'spin':          'spin 0.8s linear infinite',
      },
      keyframes: {
        fadeIn:       { from: { opacity: '0' },                              to: { opacity: '1' } },
        slideUp:      { from: { opacity: '0', transform: 'translateY(18px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        slideDown:    { from: { opacity: '0', transform: 'translateY(-10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        scaleIn:      { from: { opacity: '0', transform: 'scale(0.94)' },    to: { opacity: '1', transform: 'scale(1)' } },
        pulseSoft:    { '0%,100%': { opacity: '1' },   '50%': { opacity: '0.55' } },
        bounceGentle: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-5px)' } },
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        spin: { to: { transform: 'rotate(360deg)' } },
      },
    },
  },
  plugins: [],
}
