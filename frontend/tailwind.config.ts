import type { Config } from 'tailwindcss'

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0D0D0B',
        surface: '#1A1A16',
        border: '#2A2A24',
        primary: '#CC2200',
        critical: '#CC2200',
        warning: '#C8A96E',
        info: '#4A7C59',
        muted: '#4A4A42',
        cream: '#F5F0E8',
        gold: '#C8A96E',
      },
    },
  },
  plugins: [],
} satisfies Config
