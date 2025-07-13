import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return defineConfig({
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    server: {
      port: 3000,  // Match CRA default; change if needed
      hmr: env.DISABLE_HOT_RELOAD !== 'true',  // Disable HMR if env var is 'true'
      watch: {
        usePolling: env.DISABLE_HOT_RELOAD === 'true',  // Fallback if HMR disabled
      },
    },
    build: {
      outDir: 'dist',  // Matches CRA's 'build'
    },
    envPrefix: 'VITE_',  // All env vars must start with VITE_ now
  });
};