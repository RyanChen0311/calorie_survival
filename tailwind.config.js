/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'cursive'],
      },
      colors: {
        game: {
          bg: '#000000',
          panel: '#0a0a0a',
          accent: '#e94560',
          gold: '#f5a623',
          green: '#4ade80',
          red: '#f87171',
        },
      },
    },
  },
  plugins: [],
}
