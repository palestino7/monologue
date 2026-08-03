import { defineConfig } from 'vite';
import path from 'node:path';

const siteRoot = import.meta.dirname;

export default defineConfig({
  root: siteRoot,
  base: './',
  build: {
    outDir: path.resolve(siteRoot, '..', 'dist-site'),
    emptyOutDir: true,
  },
});
