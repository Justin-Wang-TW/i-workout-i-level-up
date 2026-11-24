/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base 用相對路徑，部署到 https://<帳號>.github.io/<儲存庫名稱>/ 也能正常載入
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { host: true },
  test: {
    include: ['packages/**/*.test.ts', 'src/**/*.test.ts', 'supabase/functions/_shared/**/*.test.ts'],
  },
});
