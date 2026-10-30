/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./client/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        campus: {
          bg: '#0A0F1D',
          surface: '#111827',
          card: '#161F36',
          border: '#1F2E4D',
          hover: '#1C2945',
          cyan: '#06B6D4',
          teal: '#14B8A6',
          blue: '#3B82F6',
          amber: '#F59E0B',
          rose: '#F43F5E',
          emerald: '#10B981',
          violet: '#8B5CF6'
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 20px -5px rgba(6, 182, 212, 0.3)',
        'glow-lg': '0 0 35px -5px rgba(6, 182, 212, 0.4)',
        'card-dark': '0 10px 30px -10px rgba(0, 0, 0, 0.5)',
      }
    },
  },
  plugins: [],
}
