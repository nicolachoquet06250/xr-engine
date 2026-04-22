import { resolve } from 'node:path';
import vue from '@vitejs/plugin-vue';
import tsconfigPaths from 'vite-tsconfig-paths';
import { defineConfig } from 'vitest/config';
import type { UserConfig } from 'vite';

export interface WorkspaceVitestOptions {
  workspaceDir: string;
  environment: 'node' | 'jsdom';
  include?: string[];
  setupFiles?: string[];
  useVue?: boolean;
  name?: string;
}

export function createWorkspaceVitestConfig(options: WorkspaceVitestOptions): UserConfig {
  const repoRoot = resolve(options.workspaceDir, '../..');
  const workspaceName = options.name ?? options.workspaceDir.split(/[\/]/).slice(-2).join('-');

  return defineConfig({
    root: options.workspaceDir,
    plugins: [
      tsconfigPaths({
        projects: [
          resolve(repoRoot, 'tsconfig.json'),
          resolve(options.workspaceDir, 'tsconfig.json'),
        ],
      }),
      ...(options.useVue ? [vue()] : []),
    ],
    test: {
      name: workspaceName,
      globals: true,
      environment: options.environment,
      include: options.include ?? ['src/**/__tests__/**/*.{test,spec}.ts'],
      exclude: ['dist/**', 'coverage/**', 'node_modules/**', '**/*.d.ts'],
      passWithNoTests: false,
      watch: false,
      reporters: ['default'],
      setupFiles: options.setupFiles,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        reportsDirectory: resolve(repoRoot, 'coverage', workspaceName),
        include: ['src/**/*.{ts,tsx,vue}'],
        exclude: ['src/**/__tests__/**', 'src/**/*.d.ts'],
      },
    },
    cacheDir: resolve(repoRoot, 'node_modules', '.vitest', workspaceName),
    resolve: {
      alias: {
        ['@xr-engine/' + options.workspaceDir]: repoRoot + "/src"
      }
    }
  });
}
