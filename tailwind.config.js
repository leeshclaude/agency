/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        rose: {
          50: '#fdf8f6',
          100: '#f7ede8',
          200: '#edd5cc',
          300: '#deb8ab',
          400: '#c9a99a',
          500: '#b58f80',
          600: '#9a7060',
          700: '#7d5548',
          800: '#5e3e35',
          900: '#3d2820',
        },
        warm: {
          50: '#faf8f6',
          100: '#f5f0ec',
          200: '#ece4dc',
          300: '#ddd2c7',
          400: '#c8b8a8',
          500: '#b09d8a',
          600: '#8e7a68',
          700: '#6e5e4f',
          800: '#4e4238',
          900: '#302820',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
