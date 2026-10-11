/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFCF9',
          100: '#FAF8F5',
          200: '#F5F1EA',
          DEFAULT: '#FAF8F5',
        },
        navy: {
          950: '#070E22',
          900: '#0B1635',
          850: '#0E1C44',
          800: '#122254',
          700: '#1B2A5E',
          600: '#253B82',
          DEFAULT: '#0B1635',
        },
        border: {
          soft: '#ECE8F2',
          subtle: '#E2DCEB',
        },
        brand: {
          teal: '#1BA39C',
          orange: '#FF8A3D',
          green: '#22C55E',
          blue: '#3B82F6',
          purple: '#8B5CF6',
        },
        pastel: {
          orange: '#FFF3E8',
          'orange-text': '#D96B27',
          green: '#EAF8F0',
          'green-text': '#16A34A',
          blue: '#EAF3FE',
          'blue-text': '#2563EB',
          purple: '#F3EDFD',
          'purple-text': '#7C3AED',
        },
      },
      borderRadius: {
        card: '18px',
        btn: '12px',
        pill: '9999px',
      },
      boxShadow: {
        soft: '0 2px 12px rgba(11, 22, 53, 0.04), 0 1px 3px rgba(11, 22, 53, 0.02)',
        card: '0 4px 20px -2px rgba(15, 30, 72, 0.04), 0 2px 6px -1px rgba(15, 30, 72, 0.02)',
        modal: '0 20px 40px -8px rgba(11, 22, 53, 0.18), 0 8px 16px -4px rgba(11, 22, 53, 0.08)',
        subtle: '0 1px 3px rgba(0, 0, 0, 0.03)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
