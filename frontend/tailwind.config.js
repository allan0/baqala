/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        baqala: {
          teal: '#00f5d4',
          orange: '#ff5e00',
          dark: '#0a0a0f',
        }
      }
    },
  },
  plugins: [],
}
