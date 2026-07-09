/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eefcfb',
          100: '#d5f7f5',
          200: '#aceceb',
          300: '#74d9d6',
          400: '#43c7c3',
          500: '#0ea5a0',
          600: '#0d7a8a',
          700: '#2d6a7f',
          800: '#1f4f61',
          900: '#163948',
        },
      },
      boxShadow: {
        soft: '0 10px 30px rgba(15, 23, 42, 0.08)',
      },
    },
  },
  plugins: [],
};
