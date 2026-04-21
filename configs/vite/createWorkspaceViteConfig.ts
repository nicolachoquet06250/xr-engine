import { builtinModules } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue';
import { defineConfig, type Plugin, type UserConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

interface WorkspacePackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

function readJson<T>(path: string): T | null {
  if (!existsSync(path)) {
    return null;
  }

  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

function pascalCase(input: string): string {
  return input
    .replace(/^@[^/]+\//, '')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

function createVirtualAppHtmlPlugin(entry: string, title: string): Plugin {
  return {
    name: 'xr-engine-virtual-app-html',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || req.method !== 'GET') {
          next();
          return;
        }

        const [pathname] = req.url.split('?');
        if (pathname !== '/' && pathname !== '/index.html') {
          next();
          return;
        }

        const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/${entry}"></script>
  </body>
</html>`;

        res.statusCode = 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html);
      });
    }
  };
}

function getPackageDeps(pkg: WorkspacePackageJson | null): string[] {
  return [
    ...Object.keys(pkg?.dependencies ?? {}),
    ...Object.keys(pkg?.peerDependencies ?? {})
  ];
}

function getWorkspaceMeta(metaUrl: string) {
  const workspaceDir = dirname(fileURLToPath(metaUrl));
  const repoRoot = resolve(workspaceDir, '../..');
  const packageJson = readJson<WorkspacePackageJson>(resolve(workspaceDir, 'package.json'));
  const relativeDir = relative(repoRoot, workspaceDir).replace(/\\/g, '/');
  const isPackage = relativeDir.startsWith('packages/');
  const isApp = relativeDir.startsWith('apps/');
  const name = packageJson?.name ?? basename(workspaceDir);
  const hasVue = Boolean(
    packageJson?.dependencies?.vue ||
      packageJson?.devDependencies?.vue ||
      packageJson?.peerDependencies?.vue ||
      packageJson?.devDependencies?.['@vitejs/plugin-vue']
  );

  return {
    workspaceDir,
    repoRoot,
    packageJson,
    relativeDir,
    isPackage,
    isApp,
    name,
    hasVue
  };
}

export function createWorkspaceViteConfig(metaUrl: string) {
  const meta = getWorkspaceMeta(metaUrl);
  const cacheKey = meta.relativeDir.replace(/[\/]/g, '_') || 'root';
  const plugins: Plugin[] = [
    tsconfigPaths({
      projects: [resolve(meta.repoRoot, 'tsconfig.json'), resolve(meta.workspaceDir, 'tsconfig.json')]
    })
  ];

  if (meta.hasVue) {
    plugins.unshift(vue());
  }

  const sharedConfig: UserConfig = {
    cacheDir: resolve(meta.repoRoot, 'node_modules/.vite', cacheKey),
    plugins,
    resolve: {
      dedupe: meta.hasVue ? ['vue'] : []
    },
    server: {
      host: true,
      open: false
    },
    preview: {
      host: true,
      open: false
    },
    define: {
      __DEV__: 'process.env.NODE_ENV !== "production"'
    }
  };

  if (meta.isPackage) {
    const entry = resolve(meta.workspaceDir, 'src/index.ts');
    const externalPackages = new Set([
      ...builtinModules,
      ...builtinModules.map((moduleName) => `node:${moduleName}`),
      ...getPackageDeps(meta.packageJson)
    ]);

    return defineConfig({
      ...sharedConfig,
      build: {
        target: 'esnext',
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
        minify: false,
        lib: {
          entry,
          name: pascalCase(meta.name),
          formats: ['es'],
          fileName: () => 'index.js'
        },
        rollupOptions: {
          external: (id) => {
            if (id.startsWith('.') || id.startsWith('/') || id.startsWith('\0')) {
              return false;
            }

            return [...externalPackages].some((pkg) => id === pkg || id.startsWith(`${pkg}/`));
          }
        }
      }
    });
  }

  if (meta.isApp) {
    const entry = 'src/main.ts';
    const title = pascalCase(meta.name);

    return defineConfig({
      ...sharedConfig,
      appType: 'custom',
      plugins: [...plugins, createVirtualAppHtmlPlugin(entry, title)],
      build: {
        target: 'esnext',
        outDir: 'dist',
        emptyOutDir: true,
        sourcemap: true,
        manifest: true,
        rollupOptions: {
          input: resolve(meta.workspaceDir, entry),
          output: {
            entryFileNames: 'assets/[name].js',
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash][extname]'
          }
        }
      }
    });
  }

  return defineConfig(sharedConfig);
}

export default createWorkspaceViteConfig;
