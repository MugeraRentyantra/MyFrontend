import defaultTheme from 'tailwindcss/defaultTheme';
import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Primary brand ramp (royal blue). Use 600 for primary actions, 50/100 for tints.
        brand: {
          50: '#eff5ff',
          100: '#dbe8fe',
          200: '#bfd7fe',
          300: '#93bbfd',
          400: '#6096fa',
          500: '#3b72f6',
          600: '#2556eb',
          700: '#1d43d8',
          800: '#1e38af',
          900: '#1e348a',
          950: '#172154',
        },
        // Data-viz tokens (validated reference palette). Text never uses these.
        viz: {
          1: '#2a78d6',
          2: '#eb6834',
          3: '#1baf7a',
          4: '#eda100',
          grid: '#e1e0d9',
          axis: '#c3c2b7',
          muted: '#898781',
        },
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', ...defaultTheme.fontFamily.sans],
        mono: ['"JetBrains Mono"', 'ui-monospace', ...defaultTheme.fontFamily.mono],
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        elevated: '0 12px 32px -12px rgb(15 23 42 / 0.28)',
        'inner-ring': 'inset 0 0 0 1px rgb(15 23 42 / 0.06)',
      },
      maxWidth: {
        '8xl': '88rem',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        'scale-in': {
          from: { opacity: '0', transform: 'translateY(4px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'slide-in-right': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'slide-in-left': { from: { transform: 'translateX(-100%)' }, to: { transform: 'translateX(0)' } },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'fade-out': 'fade-out 150ms ease-in',
        'scale-in': 'scale-in 160ms ease-out',
        'slide-in-right': 'slide-in-right 220ms cubic-bezier(0.32, 0.72, 0, 1)',
        'slide-in-left': 'slide-in-left 220ms cubic-bezier(0.32, 0.72, 0, 1)',
        'slide-up': 'slide-up 200ms ease-out',
        shimmer: 'shimmer 1.6s infinite',
      },
      typography: ({ theme }) => ({
        DEFAULT: {
          css: {
            '--tw-prose-links': theme('colors.brand.700'),
            '--tw-prose-bullets': theme('colors.slate.400'),
            maxWidth: '72ch',
            'code::before': { content: 'none' },
            'code::after': { content: 'none' },
            code: {
              backgroundColor: theme('colors.slate.100'),
              borderRadius: theme('borderRadius.md'),
              padding: '0.15em 0.35em',
              fontWeight: '500',
            },
          },
        },
      }),
    },
  },
  plugins: [typography],
};
