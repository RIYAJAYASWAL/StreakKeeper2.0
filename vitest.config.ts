import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import path from 'path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  Object.assign(process.env, env);

  return {
    test: {
      globals: true,
      environment: 'node',
      testTimeout: 20000,
      fileParallelism: false,
      server: {
        deps: {
          inline: [/next-auth/],
        },
      },
    },
    resolve: {
      alias: [
        { find: 'next/server', replacement: path.resolve(__dirname, './node_modules/next/server.js') },
        { find: '@', replacement: path.resolve(__dirname, './src') },
        { find: '@app', replacement: path.resolve(__dirname, './src/app') },
      ],
    },
  };
});
