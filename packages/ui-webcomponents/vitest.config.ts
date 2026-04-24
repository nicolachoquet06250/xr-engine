import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';

const repoRoot = resolve(import.meta.dirname, '../..');

export default defineConfig({
  root: import.meta.dirname,
  plugins: [
    vue({
      customElement: /\.ce\.vue$/,
    }),
    tsconfigPaths({
      projects: [resolve(repoRoot, 'tsconfig.json'), resolve(import.meta.dirname, 'tsconfig.json')],
    }),
  ],
  test: {
    name: 'package-ui-webcomponents',
    globals: true,
    environment: 'jsdom',
    include: ['src/**/__tests__/**/*.{test,spec}.ts'],
    exclude: ['dist/**', 'coverage/**', 'node_modules/**', '**/*.d.ts'],
    passWithNoTests: false,
    watch: false,
    reporters: ['default'],
    setupFiles: [],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: resolve(repoRoot, 'coverage', 'package-ui-webcomponents'),
      include: ['src/**/*.{ts,tsx,vue}'],
      exclude: ['src/**/__tests__/**', 'src/**/*.d.ts'],
    },
  },
  cacheDir: resolve(repoRoot, 'node_modules', '.vitest', 'package-ui-webcomponents'),
  resolve: {
    alias: {
      ['@xr-engine/' + import.meta.dirname]: repoRoot + '/src',
    },
  },
});
