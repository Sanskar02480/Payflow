/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
      },
      boxShadow: {
        // Replaces the old generic "card" shadow. Hairline + soft drop.
        card: '0 0 0 1px rgb(15 23 42 / 0.04), 0 1px 2px 0 rgb(15 23 42 / 0.04)',
        soft: '0 8px 24px -6px rgb(15 23 42 / 0.10), 0 2px 6px -2px rgb(15 23 42 / 0.05)',
        // Subtle inner highlight at the top of dark cards
        'inner-light': 'inset 0 1px 0 0 rgb(255 255 255 / 0.06)',
      },
      letterSpacing: {
        tightest: '-0.04em',
      },
      animation: {
        'fade-in': 'fadeIn 0.25s ease-out',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      backgroundImage: {
        // Faint dot grid used on auth pages instead of bright gradients
        'dot-grid':
          'radial-gradient(circle, rgb(15 23 42 / 0.06) 1px, transparent 1px)',
      },
      backgroundSize: {
        'dot-grid': '20px 20px',
      },
    },
  },
  plugins: [],
};
