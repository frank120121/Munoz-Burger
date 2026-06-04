// tailwind.config.js
module.exports = {
  content: [
    './*.html',
    './assets/**/*.js',
    './assets/css/input.css'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#B31942',
          dark:    '#8f1434',
          light:   '#d12050'
        },
        navy: {
          DEFAULT: '#0A3161',
          dark:    '#071f3e',
          light:   '#0d3f7a'
        },
        gold:  '#F4C430',
        cream: '#FFF9F0',
        dark: {
          DEFAULT:   '#111827',
          secondary: '#1F2937'
        }
      },
      fontFamily: {
        display: ['Bebas Neue', 'Impact', 'Arial Narrow', 'sans-serif'],
        body:    ['Nunito', 'Segoe UI', 'system-ui', 'sans-serif']
      },
      spacing: {
        '18':  '4.5rem',
        '88':  '22rem',
        '128': '32rem'
      },
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem'
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards'
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '100': '100'
      }
    }
  },
  plugins: []
}
