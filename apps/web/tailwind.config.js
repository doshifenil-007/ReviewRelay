/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Deep restrained monochrome palette
        surface: {
          light: '#FFFFFF',
          'light-subtle': '#F9F9FB',
          'light-muted': '#F1F1F4',
          dark: '#0E1015',
          'dark-subtle': '#14161D',
          'dark-muted': '#1B1E26',
        },
        border: {
          light: '#E5E7EB',
          'light-subtle': '#EDEDF0',
          dark: '#22252E',
          'dark-subtle': '#1B1D24',
        },
        ink: {
          light: '#111318',
          'light-muted': '#5F6573',
          'light-subtle': '#8C92A0',
          dark: '#EDEDEF',
          'dark-muted': '#8E94A0',
          'dark-subtle': '#5E6470',
        },
        // Restrained Ochre / Dark Muted Amber accent
        ochre: {
          50: '#FDF8ED',
          100: '#F9ECCB',
          200: '#F2D795',
          300: '#EABF5F',
          400: '#DFA731',
          500: '#C68B18', // Primary ochre
          600: '#A97011',
          700: '#865410',
          800: '#6E4314',
          900: '#5C3714',
        },
        // Semantic status tokens
        status: {
          healthy: '#15803D',
          'healthy-bg': '#F0FDF4',
          'healthy-dark': '#4ADE80',
          'healthy-dark-bg': '#0F2618',

          waiting: '#B45309',
          'waiting-bg': '#FFFBEB',
          'waiting-dark': '#FBBF24',
          'waiting-dark-bg': '#2B1E07',

          stale: '#DC2626',
          'stale-bg': '#FEF2F2',
          'stale-dark': '#F87171',
          'stale-dark-bg': '#2E1010',
        }
      },
      fontFamily: {
        sans: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
};
