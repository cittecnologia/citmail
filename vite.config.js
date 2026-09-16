import { defineConfig } from 'vite';

// Servidor de desenvolvimento do site estático. Sem build: as páginas são servidas como estão.
export default defineConfig({
  // mesmo subcaminho do GitHub Pages (cittecnologia.github.io/citmail/): caminho absoluto "/assets/..." quebra aqui como em produção
  base: '/citmail/',
  // mpa: arquivo inexistente responde 404 (o padrão spa devolveria index.html com 200 e esconderia recursos quebrados)
  appType: 'mpa',
  server: {
    host: '127.0.0.1',
    port: 4200,
    strictPort: true,
    fs: {
      // padrão do Vite + pastas que não fazem parte do site
      deny: ['.env', '.env.*', '*.{crt,pem,key,p12,pfx}', '**/.git/**', '**/.omc/**', '**/node_modules/.cache/**'],
    },
    watch: {
      ignored: ['**/test-results/**', '**/playwright-report/**', '**/.omc/**'],
    },
  },
});
