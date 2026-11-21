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
        // SocialPlus.ai Brand Palette
        'bg-primary': '#080808',
        'bg-secondary': '#111111',
        'bg-card': '#171717',
        'accent-yellow': '#FFD700',
        'accent-gold': '#FFC928',
        'accent-hover': '#FFE14D',
        'text-primary': '#FFFFFF',
        'text-muted': '#A1A1A1',
        'border-dark': '#292929',
        'border-light': '#383838',

        // Preserved color mappings for existing UI elements & charts
        navy: {
          950: '#080808',
          900: '#111111',
          850: '#141414',
          800: '#171717',
          750: '#1F1F1F',
          700: '#292929',
          600: '#3D3D3D',
        },
        brand: {
          purple: '#FFD700',
          violet: '#FFC928',
          indigo: '#E5C100',
          blue: '#3B82F6',
          cyan: '#06B6D4',
          accent: '#FFD700',
        },
        sentiment: {
          positive: '#10B981',
          negative: '#F43F5E',
          neutral: '#0EA5E9',
          mixed: '#F59E0B',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'glow-sm': '0 0 15px -3px rgba(255, 215, 0, 0.25)',
        'glow-md': '0 0 25px -4px rgba(255, 215, 0, 0.35)',
        'yellow-glow': '0 0 30px -5px rgba(255, 215, 0, 0.35)',
        'yellow-glow-lg': '0 0 50px -5px rgba(255, 215, 0, 0.45)',
        'card-depth': '0 10px 30px -5px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(255, 215, 0, 0.1)',
        'card-hover': '0 15px 40px -5px rgba(0, 0, 0, 0.9), 0 0 25px 2px rgba(255, 215, 0, 0.25)',
      },
    },
  },
  plugins: [],
}

