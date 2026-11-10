/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      colors: {
        forest: {
          950: '#0a2217',
          900: '#0e3020', // Swiss banking sidebar background
          850: '#133e2b',
          800: '#174933',
          750: '#1b553c',
          700: '#206346',
          600: '#297c58',
          500: '#349b6f',
        },
        sage: {
          50: '#f8faf7',
          100: '#eaf2e8', // Banner background from screenshot
          200: '#d7e6d4',
          300: '#bdd5ba',
          700: '#40604b',
          800: '#2d4736',
          900: '#1d3124',
        },
        cream: {
          50: '#ffffff',
          100: '#f7f9f6', // Main background from screenshot
          200: '#f5f2ea', // Quick action card background from screenshot
          300: '#eae4d5',
        },
        // Backwards compatibility for existing utility classes
        obsidian: {
          950: '#0e3020',
          900: '#133e2b',
          850: '#ffffff',
          800: '#f7f9f6',
          750: '#e5ede3',
          700: '#d3e0cf',
        }
      }
    },
  },
  plugins: [],
}
