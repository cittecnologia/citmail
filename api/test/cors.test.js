import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construirAppTeste } from './auxiliares.js';

const ORIGEM_PERMITIDA = 'http://127.0.0.1:4200';
const ORIGENS_NEGADAS = [
  'https://outra-origem.example',
  'http://localhost:4200',
  'http://127.0.0.1:4200.outra-origem.example',
];

test('CA5: GET com origem permitida traz allow-origin e vary, sem allow-credentials', async (t) => {
  const { app, fechar } = await construirAppTeste();
  t.after(fechar);

  const resposta = await app.inject({
    method: 'GET',
    url: '/api/health',
    headers: { origin: ORIGEM_PERMITIDA },
  });

  assert.equal(resposta.headers['access-control-allow-origin'], ORIGEM_PERMITIDA);
  assert.match(resposta.headers.vary ?? '', /Origin/);
  assert.equal(resposta.headers['access-control-allow-credentials'], undefined);
});

test('CA5: preflight permitido responde 204 com os cabeçalhos exatos', async (t) => {
  const { app, fechar } = await construirAppTeste();
  t.after(fechar);

  const resposta = await app.inject({
    method: 'OPTIONS',
    url: '/api/exemplos',
    headers: {
      origin: ORIGEM_PERMITIDA,
      'access-control-request-method': 'POST',
      'access-control-request-headers': 'content-type',
    },
  });

  assert.equal(resposta.statusCode, 204);
  assert.equal(resposta.headers['access-control-allow-origin'], ORIGEM_PERMITIDA);
  assert.equal(resposta.headers['access-control-allow-methods'], 'GET, POST');
  assert.equal(resposta.headers['access-control-allow-headers'], 'Content-Type');
  assert.match(resposta.headers.vary ?? '', /Origin/);
});

for (const origemNegada of ORIGENS_NEGADAS) {
  test(`CA5: GET com origem negada "${origemNegada}" não traz access-control-allow-origin`, async (t) => {
    const { app, fechar } = await construirAppTeste();
    t.after(fechar);

    const resposta = await app.inject({
      method: 'GET',
      url: '/api/health',
      headers: { origin: origemNegada },
    });

    assert.equal(resposta.headers['access-control-allow-origin'], undefined);
  });

  test(`CA5: preflight com origem negada "${origemNegada}" não traz access-control-allow-origin`, async (t) => {
    const { app, fechar } = await construirAppTeste();
    t.after(fechar);

    const resposta = await app.inject({
      method: 'OPTIONS',
      url: '/api/exemplos',
      headers: {
        origin: origemNegada,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });

    assert.equal(resposta.headers['access-control-allow-origin'], undefined);
  });
}

test('CA5: requisição sem Origin é atendida sem access-control-allow-origin', async (t) => {
  const { app, fechar } = await construirAppTeste();
  t.after(fechar);

  const resposta = await app.inject({ method: 'GET', url: '/api/health' });

  assert.equal(resposta.statusCode, 200);
  assert.equal(resposta.headers['access-control-allow-origin'], undefined);
});
