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
        bg0: '#0d1117',
        bg1: '#161b22',
        bg2: '#21262d',
        bd: '#30363d',
        aB: '#58a6ff',
        aG: '#3fb950',
        aO: '#d29922',
        aR: '#f85149',
        aP: '#bc8cff',
        aC: '#39d2c0',
        t1: '#e6edf3',
        t2: '#8b949e',
        tM: '#484f58',
      },
    },
  },
  plugins: [],
};
