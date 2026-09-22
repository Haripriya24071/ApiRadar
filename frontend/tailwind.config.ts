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
        background: '#0A0A0F',
        surface: '#111118',
        border: '#1E1E2E',
        primary: '#6366F1',
        critical: '#EF4444',
        warning: '#F59E0B',
        info: '#10B981',
        muted: '#64748B',
      },
    },
  },
  plugins: [],
} satisfies Config
