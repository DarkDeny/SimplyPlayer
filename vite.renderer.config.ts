import { defineConfig } from 'vite';

// https://vitejs.dev/config
// Using esbuild's built-in JSX support instead of @vitejs/plugin-react
// to avoid ESM compatibility issues with Electron Forge
export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
});
