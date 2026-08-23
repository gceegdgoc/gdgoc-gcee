/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50: '#f4f7fc',
          100: '#e7edf7',
          200: '#ccd9ec',
          300: '#a3b9dc',
          400: '#6f8fc4',
          500: '#3b6fc4',
          600: '#2a5291',
          700: '#1b3a66',
          800: '#12294a',
          900: '#0b1b33',
          950: '#050b16',
        },
        g: {
          blue: '#4285F4',
          green: '#34A853',
          yellow: '#FBBC05',
          red: '#EA4335',
        },
        ink: {
          DEFAULT: '#0b1b33',
          soft: '#3c4b63',
          muted: '#6b7a90',
          faint: '#9aa5b1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Space Grotesk', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11,27,51,0.05), 0 8px 24px -8px rgba(11,27,51,0.12)',
        lift: '0 2px 4px rgba(11,27,51,0.06), 0 16px 40px -12px rgba(11,27,51,0.22)',
        glow: '0 0 0 3px rgba(66,133,244,0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease forwards',
        'slide-up': 'slideUp 0.5s ease forwards',
        'float-slow': 'floatSlow 8s ease-in-out infinite',
        'float-slower': 'floatSlow 11s ease-in-out infinite',
        'blob': 'blob 14s ease-in-out infinite',
        'spin-slow': 'spin 24s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        floatSlow: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-16px)' },
        },
        blob: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(28px,-24px) scale(1.08)' },
          '66%': { transform: 'translate(-18px,16px) scale(0.94)' },
        },
      },
    },
  },
  plugins: [],
};
