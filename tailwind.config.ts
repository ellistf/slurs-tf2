import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        surface: '#1a1a1a',
        panel: '#141414',
        line: '#2a2a2a',
        muted: '#888888',
        text: '#cccccc',
        bright: '#f6f6f6',
        accent: '#4a90d9',
        racial: '#e06060',
        bigotry: '#b06ad6',
        generic: '#80aa80'
      },
      fontFamily: {
        display: ['var(--font-display)'],
        body: ['var(--font-body)']
      },
      boxShadow: {
        panel: '0 20px 80px rgba(0, 0, 0, 0.35)'
      }
    }
  },
  plugins: []
};

export default config;
