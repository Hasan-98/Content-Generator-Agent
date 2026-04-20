/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        indeterminate: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(500%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite linear',
        indeterminate: 'indeterminate 1.2s ease-in-out infinite',
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        bg0: '#ffffff',
        bg1: '#f6f8fa',
        bg2: '#eaeef2',
        bd: '#d0d7de',
        aB: '#0969da',
        aG: '#1a7f37',
        aO: '#bf8700',
        aR: '#cf222e',
        aP: '#8250df',
        aC: '#1b7c83',
        t1: '#1f2328',
        t2: '#656d76',
        tM: '#8c959f',
      },
    },
  },
  plugins: [],
};
