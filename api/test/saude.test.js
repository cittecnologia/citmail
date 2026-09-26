import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construirAppTeste } from './auxiliares.js';

test('CA1: GET /api/health responde 200 com banco no ar', async (t) => {
  const { app, fechar } = await construirAppTeste();
  t.after(fechar);

  const resposta = await app.inject({ method: 'GET', url: '/api/health' });

  assert.equal(resposta.statusCode, 200);
  assert.equal(resposta.headers['content-type'], 'application/json; charset=utf-8');
  assert.equal(resposta.headers['cache-control'], 'no-store');
  assert.deepEqual(resposta.json(), { status: 'ok', banco: 'ok' });
  assert.match(resposta.headers['x-request-id'], /^[0-9a-f-]{36}$/);
});

test('CA2: GET /api/health responde 503 em menos de 3s com banco inacessível', async (t) => {
  // Porta 1 em loopback: ninguém escuta ali, então a recusa é imediata e
  // determinística (sem depender de timeout de rede).
  const { app, fechar } = await construirAppTeste({
    comBanco: false,
    sobrescritasConfig: { databaseUrl: 'postgres://postgres@127.0.0.1:1/x' },
  });
  t.after(fechar);

  const inicio = Date.now();
  const resposta = await app.inject({ method: 'GET', url: '/api/health' });
  const duracaoMs = Date.now() - inicio;

  assert.equal(resposta.statusCode, 503);
  assert.ok(duracaoMs < 3000, `demorou ${duracaoMs}ms, esperado < 3000ms`);
  assert.equal(resposta.headers['cache-control'], 'no-store');
  assert.deepEqual(resposta.json(), { status: 'indisponivel', banco: 'indisponivel' });

  for (const trecho of ['127.0.0.1', ':1', 'ECONNREFUSED', 'postgres']) {
    assert.ok(!resposta.body.includes(trecho), `corpo não deveria conter "${trecho}": ${resposta.body}`);
  }
});

test('CA2: log de warn traz requestId e código do erro, sem a connection string', async (t) => {
  const { app, captura, fechar } = await construirAppTeste({
    comBanco: false,
    sobrescritasConfig: { databaseUrl: 'postgres://postgres@127.0.0.1:1/x' },
  });
  t.after(fechar);

  const resposta = await app.inject({ method: 'GET', url: '/api/health' });
  const requestId = resposta.headers['x-request-id'];

  const linhaWarn = captura
    .linhas()
    .find((linha) => linha.level === 40 && linha.reqId === requestId);

  assert.ok(linhaWarn, 'era esperado um log warn (level 40) com o reqId da requisição');
  assert.equal(linhaWarn.codigo, 'ECONNREFUSED');
  assert.ok(!JSON.stringify(linhaWarn).includes('postgres://'), 'log não deveria conter a connection string');
});

test('CA2: a API se recupera e volta a responder 200 quando o banco volta', async (t) => {
  let jaFalhou = false;

  // Pool falso: rejeita na primeira consulta (simula banco fora do ar) e
  // resolve na segunda (simula o banco voltando), sem reiniciar o app.
  const poolQueSeRecupera = {
    async query() {
      if (!jaFalhou) {
        jaFalhou = true;
        const erro = new Error('conexão recusada');
        erro.code = 'ECONNREFUSED';
        throw erro;
      }
      return { rows: [{ '?column?': 1 }] };
    },
    on() {},
    async end() {},
  };

  const { app, fechar } = await construirAppTeste({ comBanco: false, pool: poolQueSeRecupera });
  t.after(fechar);

  const primeira = await app.inject({ method: 'GET', url: '/api/health' });
  assert.equal(primeira.statusCode, 503);

  const segunda = await app.inject({ method: 'GET', url: '/api/health' });
  assert.equal(segunda.statusCode, 200);
});
