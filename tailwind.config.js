/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#6C4CFD',
          hover: '#5B3EF5',
          light: '#ECE9FF',
        },
        success: {
          DEFAULT: '#16A34A',
          light: '#22C55E', // from the original spec
        },
        danger: {
          DEFAULT: '#EF4444',
        },
        warning: {
          DEFAULT: '#F59E0B',
        },
        background: '#F7F8FC',
        card: '#FFFFFF',
        border: '#E5E7EB',
        text: '#111827',
        secondary: '#6B7280',
      },
      fontFamily: {
        sans: ['Inter', 'SF Pro Display', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 10px 30px rgba(0,0,0,.05)',
      },
      borderRadius: {
        'card': '24px',
        'DEFAULT': '20px',
        'button': '16px',
        'input': '12px',
        'badge': '9999px',
        'progress': '999px',
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
