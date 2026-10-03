import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { beastOctane } from 'beast-tsrx/vite'
import { defineConfig } from 'vite'
import { beastDevtools } from '@beastjs/devtools'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  plugins: [tailwindcss(), beastOctane({ octane: { profile: 'auto' } }), beastDevtools()]
})
