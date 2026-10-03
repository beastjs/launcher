import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import { beastOctane } from 'beast-tsrx/vite'
import { defineConfig } from 'vite'
import { repoImportGuard } from './scripts/checks/repo-imports.ts'
import { beastDevtools } from '@beastjs/devtools'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: { fs: { deny: ['**/repos/**', '.env', '.env.*', '*.{crt,pem}', '**/.git/**'] } },
  plugins: [repoImportGuard(), tailwindcss(), beastOctane({ octane: { profile: 'auto' } }), beastDevtools()]
})
