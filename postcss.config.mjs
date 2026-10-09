import { fileURLToPath } from 'node:url'

export default {
  plugins: {
    '@tailwindcss/postcss': { base: fileURLToPath(new URL('./src', import.meta.url)) },
  },
}
