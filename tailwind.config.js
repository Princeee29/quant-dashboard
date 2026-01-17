/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#030508', // Lebih gelap dari sebelumnya (Midnight Black)
        surface: '#090c10',    // Warna kartu
        primary: '#3b82f6',
        accent: '#6366f1',
        success: '#00e676',    // Neon Green
        danger: '#ff1744',     // Neon Red
        warning: '#ffc400',
        'border-subtle': '#1e293b',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'], // Ganti font angka agar lebih teknikal
      },
      boxShadow: {
        'neon-green': '0 0 10px rgba(0, 230, 118, 0.2), 0 0 20px rgba(0, 230, 118, 0.1)',
        'neon-red': '0 0 10px rgba(255, 23, 68, 0.2), 0 0 20px rgba(255, 23, 68, 0.1)',
        'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shine': 'shine 2s linear infinite',
      },
      keyframes: {
        shine: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' }
        }
      }
    },
  },
  plugins: [],
}