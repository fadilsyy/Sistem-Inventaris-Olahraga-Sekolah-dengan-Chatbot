/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './views/**/*.html',
    './public/js/**/*.js'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#EFF5FF',
          100: '#DBE8FE',
          200: '#BFD7FE',
          300: '#93BBFD',
          400: '#6095FA',
          500: '#2E72F6',
          600: '#155EEF',
          700: '#1048C7',
          800: '#123996',
          900: '#0F296B',
          950: '#08173E'
        },
        accent: {
          50: '#FFF4ED',
          100: '#FFE6D5',
          200: '#FECEAA',
          300: '#FDAB74',
          400: '#FB803C',
          500: '#F96416',
          600: '#EA4C0B',
          700: '#C23B0B',
          800: '#9A300F',
          900: '#7C2910'
        }
      },
      fontFamily: {
        display: [
          '"Barlow Condensed"',
          '"Barlow"',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'sans-serif'
        ],
        sans: [
          '"Barlow"',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif'
        ]
      }
    }
  },
  plugins: []
};
