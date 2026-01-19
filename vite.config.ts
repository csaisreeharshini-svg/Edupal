import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    // Use VITE_BASE_URL env var for flexibility (Vercel uses '/', GitHub Pages uses '/Edupal/')
    base: env.VITE_BASE_URL || '/',
    server: {
      port: 3000,
      host: '0.0.0.0',
    },
    plugins: [react()],
    define: {
      // Support multiple API key env var names for flexibility
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.API_KEY || ''),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.API_KEY || ''),
      // For NVIDIA NIM or other OpenAI-compatible APIs
      'process.env.LLM_BASE_URL': JSON.stringify(env.LLM_BASE_URL || ''),
      'process.env.LLM_MODEL': JSON.stringify(env.LLM_MODEL || '')
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
