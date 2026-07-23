import { defineConfig } from 'vitest/config';

// vite.config.ts (PWAプラグイン等) を読み込まず、ドメイン層の純粋なテストだけを実行する
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    testTimeout: 30000,
  },
});
