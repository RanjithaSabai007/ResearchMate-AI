/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        pastel: {
          pink: '#F2C7C7',
          green: '#D5F3D8',
          accent: '#C75F71',
          highlight: '#FFB7C5',
          darkBg: '#121214',
          darkCard: '#1E1E24',
          darkBorder: '#2E2E38'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
