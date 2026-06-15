/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Healthcare severity color system
        stable: {
          light: '#E6F4EA',
          DEFAULT: '#10B981',
          dark: '#059669',
        },
        warning: {
          light: '#FFF9E6',
          DEFAULT: '#F59E0B',
          dark: '#D97706',
        },
        highalert: {
          light: '#FFF3E0',
          DEFAULT: '#F97316',
          dark: '#EA580C',
        },
        critical: {
          light: '#FCE8E6',
          DEFAULT: '#EF4444',
          dark: '#DC2626',
        },
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 8px -1px rgba(0, 0, 0, 0.03)',
        'soft-lg': '0 10px 30px -5px rgba(0, 0, 0, 0.05), 0 4px 12px -2px rgba(0, 0, 0, 0.03)',
      }
    },
  },
  plugins: [],
}
