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
          // ── LIGHT MODE ──────────────────────────────────
          bg:               '#FDFDFE',  // Pale Grey        — main page bg
          surface:          '#F0F3F5',  // Anti-Flash White — cards / surfaces
          hover:            '#E8EBEE',  // hover state bg
          primary:          '#3D766D',  // Greensleeves     — accent, buttons
          'primary-dark':   '#2F5C55',  // darkened accent  — hover states
          'primary-light':  'rgba(61,118,109,0.10)',
          text:             '#1A1C1E',  // near-black       — headings & body
          'secondary-text': '#8F9192',  // Alloy            — secondary text
          muted:            '#BDC2C7',  // Metallic         — muted text/icons
          border:           '#D6D9DF',  // Hidden Creek     — borders/dividers
          // ── DARK MODE (CSS-vars handle this at runtime) ─
          // ── SHARED SEMANTIC ─────────────────────────────
          success:          '#10B981',  // emerald-500 — meal ON
          danger:           '#F43F5E',  // rose-500    — meal OFF
          'danger-light':   '#FFF1F2',
          'success-light':  '#ECFDF5',
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
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.07)',
      },
      backgroundImage: {
        'btn-primary': 'linear-gradient(135deg, #2563EB, #3B82F6)',
        'btn-primary-hover': 'linear-gradient(135deg, #1D4ED8, #2563EB)',
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
