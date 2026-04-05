/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        blossom: {
          DEFAULT: '#F2A7BE',
          light:   '#FAE8EF',
          deep:    '#D4688A',
          dark:    '#8C3A55',
        },
        petal:        '#FDF4F7',
        bark: {
          DEFAULT: '#2C1A22',
          soft:    '#6B4A57',
        },
        cream:        '#FAF7F5',
        'warm-white': '#FEF9FB',
      },
      fontFamily: {
        headline: ['Josefin Sans', 'sans-serif'],
        body:     ['DM Sans', 'sans-serif'],
        sans:     ['DM Sans', 'sans-serif'],
      },
      letterSpacing: {
        headline: '0.18em',
        label:    '0.20em',
        wide:     '0.14em',
      },
      borderRadius: {
        brand: '12px',
      },
    },
  },
  plugins: [],
}
