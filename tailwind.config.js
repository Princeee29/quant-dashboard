/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'trade-bg': '#050505',       // Hitam pekat background
        'card-bg': '#0A0A0A',        // Hitam agak terang untuk kartu
        'border-dark': '#1C1C1C',    // Garis pemisah halus
        'neon-lime': '#ccf281',      // Hijau terang untuk pagination
        'pill-gray': '#1E1E1E',      // Warna tombol filter
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'sans-serif'], // Font premium
      }
    },
  },
  plugins: [],
}