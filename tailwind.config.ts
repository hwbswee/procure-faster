import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'notion-gray': '#37352f',
        'notion-border': '#e5e5e5',
      },
    },
  },
  plugins: [],
}
export default config
