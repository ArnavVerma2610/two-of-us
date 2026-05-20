/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#15131C',
        bone: '#F4ECDC',
        'cyan-pop': '#2EC4D6',
        'orange-pop': '#FF7A2A',
        'red-accent': '#E63946',
        gold: '#F2B33D',
        mint: '#7FD6A8',
        violet: '#6B5BD2',
        'gray-grid': '#2A2735',
        'bg-deep': '#0B0A12',
      },
      fontFamily: {
        press: ['"Press Start 2P"', 'monospace'],
        vt: ['"VT323"', 'monospace'],
      },
    },
  },
  plugins: [],
}
