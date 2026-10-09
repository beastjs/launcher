import { resolve } from 'node:path'
import { defineConfig } from '@rspack/cli'
import { CopyRspackPlugin, HtmlRspackPlugin } from '@rspack/core'
import { beastOctane } from 'beast-tsrx/rspack'
import { beastDevtools } from '@beastjs/devtools/rspack'
import { beastPageBuilder } from '@beastjs/page-builder/rspack'
import { repoImportGuard } from './scripts/checks/repo-imports.ts'

const root = import.meta.dirname

export default defineConfig((_env, argv) => {
  const production = argv.mode === 'production'

  return {
    context: root,
    entry: './src/main.ts',
    target: ['web', 'es2022'],
    devtool: production ? false : 'eval-cheap-module-source-map',
    output: {
      path: resolve(root, 'dist'),
      filename: 'assets/[name].[contenthash:8].js',
      chunkFilename: 'assets/[name].[contenthash:8].js',
      cssFilename: 'assets/[name].[contenthash:8].css',
      cssChunkFilename: 'assets/[name].[contenthash:8].css',
      assetModuleFilename: 'assets/[name].[contenthash:8][ext]',
      publicPath: '/',
      clean: true,
    },
    resolve: {
      alias: { '@': resolve(root, 'src') },
      // Prefer link.ts over Link.tsrx on case-insensitive filesystems.
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.json', '.tsrx', '.btsx'],
    },
    module: {
      rules: [
        {
          test: /\.css$/,
          type: 'css',
          use: ['postcss-loader'],
        },
        {
          test: /\.(?:png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|mp3|wav)$/i,
          type: 'asset/resource',
        },
      ],
    },
    plugins: [
      repoImportGuard(),
      beastOctane({ octane: { profile: !production } }),
      new HtmlRspackPlugin({ template: './index.html' }),
      new CopyRspackPlugin({
        patterns: [
          { from: 'public', to: '.' },
          { from: 'favicon.ico', to: 'favicon.ico' },
        ],
      }),
      beastDevtools(),
      beastPageBuilder({ launcher: false }),
    ],
    devServer: {
      host: 'localhost',
      port: 5173,
      hot: true,
      historyApiFallback: true,
      static: { directory: resolve(root, 'public') },
    },
    watchOptions: { ignored: ['**/repos/**', '**/node_modules/**', '**/dist/**'] },
  }
})
