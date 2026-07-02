/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        nex: {
          bg:        '#FAF5F0',   // Warm Sand  — main body
          surface:   '#FFFFFF',   // white      — cards & containers
          primary:   '#4A6D56',   // Sage-500   — accent, buttons, active
          'primary-dark': '#3A5643', // Sage-600
          text:      '#221E1A',   // cocoa-charcoal — headings
          muted:     '#8C8276',   // beige-grey  — descriptions
          border:    '#F2ECE4',   // tan border  — subtle borders
          success:   '#10B981',   // emerald-500 — meal ON
          danger:    '#F43F5E',   // rose-500   — meal OFF
          'danger-light': '#FFF1F2', // rose-50
          'success-light': '#ECFDF5', // emerald-50
          'primary-light': '#EDF2EE', // Sage-50
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'Avenir', 'Helvetica', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        'card': '16px',    // rounded-2xl for cards
        'btn':  '8px',     // rounded-lg for buttons
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgb(0 0 0 / 0.04), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.05)',
      },
      backgroundImage: {
        'btn-primary': 'linear-gradient(135deg, #3A5643, #4A6D56)',
        'btn-primary-hover': 'linear-gradient(135deg, #2B4032, #3A5643)',
      },
      backdropBlur: {
        'glass': '12px',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
}
