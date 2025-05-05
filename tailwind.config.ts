
import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        forge: {
          dark: "#0F172A",
          primary: "#6366F1",
          accent: "#A855F7",
          light: "#E0E7FF",
        },
      },
      animation: {
        "pulse-slow": "pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
      backgroundColor: {
        "gradient-dark": "linear-gradient(to right, #0F172A, #1E293B)",
      },
    },
  },
  plugins: [],
} satisfies Config;
