import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: '',
      name: 'XREngine',
      formats: ['es'],
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
});
