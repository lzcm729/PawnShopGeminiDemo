/// <reference types="vitest" />
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import TOML from '@iarna/toml';
import type { Plugin } from 'vite';

// Custom TOML plugin that works reliably on Windows
function tomlPlugin(): Plugin {
    return {
        name: 'vite-plugin-toml-custom',
        transform(code, id) {
            if (!id.endsWith('.toml')) return null;
            const parsed = TOML.parse(code);
            return {
                code: `export default ${JSON.stringify(parsed, null, 2)};`,
                map: null
            };
        }
    };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const isElectron = process.env.ELECTRON === 'true' || mode === 'production';

    return {
      // Use relative paths for Electron (file:// protocol)
      base: isElectron ? './' : '/',
      // Serve assets folder as public directory
      publicDir: 'assets',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react(), tomlPlugin()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        // Ensure assets use relative paths
        assetsDir: 'assets',
        rollupOptions: {
          output: {
            // Ensure consistent chunk naming
            chunkFileNames: 'assets/[name]-[hash].js',
            entryFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash][extname]'
          }
        }
      },
      // Vitest configuration
      test: {
        globals: true,
        environment: 'node',
        include: ['systems/**/*.test.ts', 'tests/unit/**/*.test.ts'],
        exclude: ['tests/*.test.ts'], // Exclude Playwright E2E tests
      }
    };
});
