import { defineConfig } from 'vite';

// Servidor de desenvolvimento do site estático (substitui o antigo serve.py).
// Sem build: as páginas são servidas como estão, por HTTP (o sprite de ícones não funciona via file://).
export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 4200,
    strictPort: true,
  },
});
