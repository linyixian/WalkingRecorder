import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: './',
  plugins: command === 'serve' ? [basicSsl()] : [],
  server: {
    host: '0.0.0.0',
    https: true,
  },
  preview: {
    host: '0.0.0.0',
    https: true,
  },
}));
