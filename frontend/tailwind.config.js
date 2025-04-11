/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme'); // Import defaultTheme

export default {
  darkMode: 'class', // Enable dark mode via class
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // Include all JS/TS/JSX/TSX files in src
    "./src/**/*.css",             // ADD THIS LINE to include CSS files
  ],
  theme: {
    extend: {
      fontFamily: {
        // Example: Add 'Inter' font stack (ensure it's imported in index.css)
        sans: ['Inter var', ...defaultTheme.fontFamily.sans],
        // Optional: Add a more evocative font for specific elements if desired
        // serif: ['Source Serif Pro', ...defaultTheme.fontFamily.serif],
      },
      colors: {
        // Define custom colors for dark theme (adjust as needed)
        'dark-bg': '#1a1a1a',      // Dark background
        'dark-surface': '#2a2a2a', // Slightly lighter surface (panels, etc.)
        'dark-text': '#e0e0e0',   // Primary text color
        'dark-text-secondary': '#a0a0a0', // Secondary text
        'dark-border': '#444444',  // Borders
        'accent': '#8b5cf6',      // Example accent color (purple)
        'accent-hover': '#7c3aed',
      },
      // Optional: Add texture using background images
      // backgroundImage: {
      //   'dark-texture': "url('/path/to/your/texture.png')",
      // }
    },
  },
  plugins: [],
} 