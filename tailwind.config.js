/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', '"Outfit"', 'system-ui', 'sans-serif'],
        serif: ['"Newsreader"', '"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        ivory: {
          50: '#FFFDF8',
          100: '#FBF7EE',
          200: '#F5EFE0',
          300: '#EDE3CC',
        },
        gold: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
        },
        obsidian: {
          900: '#181510',
          800: '#27231C',
          700: '#3D372E',
          600: '#5C5446',
          500: '#8A8070',
        }
      },
      boxShadow: {
        'glass': '0 16px 40px -8px rgba(140, 105, 30, 0.09), 0 4px 12px -2px rgba(24, 21, 16, 0.04), inset 0 1px 0 0 rgba(255, 255, 255, 0.92)',
        'glass-lg': '0 24px 60px -12px rgba(140, 105, 30, 0.14), 0 8px 24px -4px rgba(24, 21, 16, 0.06), inset 0 1px 0 0 rgba(255, 255, 255, 0.95)',
        'glass-hover': '0 22px 48px -8px rgba(180, 130, 30, 0.16), 0 6px 16px -2px rgba(24, 21, 16, 0.06), inset 0 1px 0 0 rgba(255, 255, 255, 1)',
        'gold-glow': '0 12px 32px -6px rgba(217, 119, 6, 0.35), 0 4px 12px -2px rgba(245, 158, 11, 0.25), inset 0 1px 0 0 rgba(255, 255, 255, 0.45)',
      }
    },
  },
  plugins: [],
};
