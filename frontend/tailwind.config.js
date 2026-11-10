/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      colors: {
        obsidian: {
          950: '#060913',
          900: '#080D1A',
          850: '#0D1424',
          800: '#131B2E',
          750: '#18223A',
          700: '#1E2B47',
        },
        vault: {
          emerald: '#10B981',
          teal: '#14B8A6',
          cyan: '#06B6D4',
          amber: '#F59E0B',
          rose: '#F43F5E',
          slate: '#64748B',
        }
      }
    },
  },
  plugins: [],
}
