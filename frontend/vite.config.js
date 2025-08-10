import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // AGORA COM A PORTA CORRETA DO SEU FRONTEND
    proxy: {
      '/api': {
        target: 'http://localhost:8000', // O endereço do seu backend FastAPI
        changeOrigin: true, // Necessário para reescrever o cabeçalho Host
      },
    },
  },
});

