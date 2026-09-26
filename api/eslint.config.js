// Lint mínimo da API (CIT-54): só as regras recomendadas do ESLint, sem regras de estilo.
import js from '@eslint/js';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: globals.node,
    },
    rules: {
      // Omitir uma chave com `const { CHAVE: _descartado, ...resto } = objeto` é intencional nos testes.
      'no-unused-vars': ['error', { ignoreRestSiblings: true }],
    },
  },
];
