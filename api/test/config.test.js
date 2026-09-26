import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarConfig } from '../src/config.js';

// `carregarConfig(env = process.env)`: aceita um objeto de ambiente
// explícito (conferido em `api/src/config.js`), então os testes abaixo não
// precisam mutar `process.env` global.

const AMBIENTE_BASE = {
  DATABASE_URL: 'postgres://postgres@127.0.0.1:55433/postgres',
  CORS_ORIGENS: 'http://127.0.0.1:4200',
  NODE_ENV: 'test',
};

const VALORES_CORS_INVALIDOS = ['*', '', 'http://127.0.0.1:4200,*'];

for (const corsOrigens of VALORES_CORS_INVALIDOS) {
  test(`CA5: carregarConfig lança erro com CORS_ORIGENS = ${JSON.stringify(corsOrigens)}`, () => {
    assert.throws(() => carregarConfig({ ...AMBIENTE_BASE, CORS_ORIGENS: corsOrigens }));
  });
}

test('CA5: carregarConfig lança erro sem DATABASE_URL', () => {
  const { DATABASE_URL: _descartado, ...ambienteSemBanco } = AMBIENTE_BASE;
  assert.throws(() => carregarConfig(ambienteSemBanco));
});

test('CA5: a mensagem de erro cita o nome da variável, não o valor do segredo', () => {
  const { DATABASE_URL: _descartado, ...ambienteSemBanco } = AMBIENTE_BASE;

  assert.throws(
    () => carregarConfig(ambienteSemBanco),
    (erro) => {
      assert.match(erro.message, /DATABASE_URL/);
      return true;
    },
  );
});
