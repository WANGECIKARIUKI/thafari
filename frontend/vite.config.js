
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, resolve('.'), '');

  const apiUrl =
    env.API_URL ||
    env.VITE_API_URL ||
    (mode === 'development' ? 'http://localhost:5000/api' : '');

  if (!apiUrl) {
    throw new Error(
      'Missing API_URL or VITE_API_URL environment variable.'
    );
  }

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
    },
  };
});
