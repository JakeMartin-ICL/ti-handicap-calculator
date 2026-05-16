/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        space: {
          950: '#04060f',
          900: '#080c14',
          800: '#0d1424',
          700: '#111d2f',
          600: '#152038',
          500: '#1e3052',
          400: '#2a4060',
        },
        gold: {
          300: '#f0d78c',
          400: '#ddb93f',
          500: '#c9a227',
          600: '#a8841f',
          700: '#876818',
        },
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.35s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
