import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carregarConfig } from '../src/config.js';
import { construirApp } from '../src/app.js';
import { criarCapturaDeLog } from './auxiliares.js';

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

// Revisão: origem precisa ser exata (esquema://host[:porta], sem caminho nem
// barra final); `origemExata` usa `new URL(origem).origin === origem`.
const VALORES_CORS_SEM_ORIGEM_EXATA = [
  'null',
  '127.0.0.1:4200',
  'http://127.0.0.1:4200/painel',
  'http://127.0.0.1:4200/',
];

for (const origemInvalida of VALORES_CORS_SEM_ORIGEM_EXATA) {
  test(`Revisão: carregarConfig lança erro com CORS_ORIGENS não exata (${JSON.stringify(origemInvalida)})`, () => {
    assert.throws(
      () => carregarConfig({ ...AMBIENTE_BASE, CORS_ORIGENS: origemInvalida }),
      (erro) => {
        assert.equal(
          erro.message,
          'CORS_ORIGENS inválida: cada item deve ser uma origem exata (esquema://host[:porta], sem caminho nem barra final)',
        );
        return true;
      },
    );
  });
}

test('Revisão: NODE_ENV inválido lança erro com a lista de valores aceitos', () => {
  assert.throws(
    () => carregarConfig({ ...AMBIENTE_BASE, NODE_ENV: 'homologacao' }),
    (erro) => {
      assert.equal(erro.message, 'NODE_ENV inválida: use production, development ou test');
      return true;
    },
  );
});

test('Revisão: NODE_ENV ausente vira "production" (falha fechada) e desativa POST /api/exemplos', async (t) => {
  const { NODE_ENV: _descartado, ...ambienteSemNodeEnv } = AMBIENTE_BASE;

  const config = carregarConfig(ambienteSemNodeEnv);
  assert.equal(config.nodeEnv, 'production');

  // Pool falso: o teste não usa /api/health, só confirma o efeito de
  // nodeEnv sobre o registro (ou não) da rota de exemplo.
  const poolFalso = { async query() { return { rows: [] }; }, on() {}, async end() {} };
  const captura = criarCapturaDeLog();
  const app = construirApp(config, { pool: poolFalso, logStream: captura.stream });
  t.after(() => app.close());

  const resposta = await app.inject({
    method: 'POST',
    url: '/api/exemplos',
    payload: { titulo: 'Teste', quantidade: 2 },
  });

  assert.equal(resposta.statusCode, 404);
});
