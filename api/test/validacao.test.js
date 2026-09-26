import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construirAppTeste } from './auxiliares.js';

function ordenarPorCampo(campos) {
  return [...campos].sort((a, b) => a.campo.localeCompare(b.campo));
}

test('CA4: corpo válido responde 200 com o mesmo corpo', async (t) => {
  const { app, fechar } = await construirAppTeste();
  t.after(fechar);

  const resposta = await app.inject({
    method: 'POST',
    url: '/api/exemplos',
    payload: { titulo: 'Teste', quantidade: 2 },
  });

  assert.equal(resposta.statusCode, 200);
  assert.deepEqual(resposta.json(), { titulo: 'Teste', quantidade: 2 });
});

test('CA4: campo obrigatório ausente, fora do limite e não permitido geram 400 ordenado por campo', async (t) => {
  const { app, fechar } = await construirAppTeste();
  t.after(fechar);

  const resposta = await app.inject({
    method: 'POST',
    url: '/api/exemplos',
    payload: { quantidade: 0, extra: true },
  });

  assert.equal(resposta.statusCode, 400);
  const corpo = resposta.json();
  assert.equal(corpo.erro, 'validacao');
  assert.deepEqual(ordenarPorCampo(corpo.campos), [
    { campo: 'extra', mensagem: 'campo não permitido' },
    { campo: 'quantidade', mensagem: 'fora do limite' },
    { campo: 'titulo', mensagem: 'obrigatório' },
  ]);
});

test('CA4: título maior que 80 caracteres e quantidade com tipo errado geram 400', async (t) => {
  const { app, fechar } = await construirAppTeste();
  t.after(fechar);

  const resposta = await app.inject({
    method: 'POST',
    url: '/api/exemplos',
    payload: { titulo: 'a'.repeat(81), quantidade: 'abc' },
  });

  assert.equal(resposta.statusCode, 400);
  const porCampo = Object.fromEntries(resposta.json().campos.map((c) => [c.campo, c.mensagem]));
  assert.equal(porCampo.titulo, 'fora do limite');
  assert.equal(porCampo.quantidade, 'tipo inválido');
});

test('CA4: JSON malformado responde 400 com erro json_invalido', async (t) => {
  const { app, fechar } = await construirAppTeste();
  t.after(fechar);

  const resposta = await app.inject({
    method: 'POST',
    url: '/api/exemplos',
    headers: { 'content-type': 'application/json' },
    payload: '{"titulo":',
  });

  assert.equal(resposta.statusCode, 400);
  assert.deepEqual(resposta.json(), { erro: 'json_invalido' });
});

test('CA4: nenhuma resposta 400 vaza stack, node_modules, " at " ou FST_', async (t) => {
  const { app, fechar } = await construirAppTeste();
  t.after(fechar);

  const respostas = await Promise.all([
    app.inject({ method: 'POST', url: '/api/exemplos', payload: { quantidade: 0, extra: true } }),
    app.inject({
      method: 'POST',
      url: '/api/exemplos',
      payload: { titulo: 'a'.repeat(81), quantidade: 'abc' },
    }),
    app.inject({
      method: 'POST',
      url: '/api/exemplos',
      headers: { 'content-type': 'application/json' },
      payload: '{"titulo":',
    }),
  ]);

  for (const resposta of respostas) {
    assert.equal(resposta.statusCode, 400);
    for (const trecho of ['stack', 'node_modules', ' at ', 'FST_']) {
      assert.ok(!resposta.body.includes(trecho), `corpo não deveria conter "${trecho}": ${resposta.body}`);
    }
  }
});

test('CA4 (proposto): erro não tratado numa rota responde 500 sem stack, com requestId', async (t) => {
  const { app, fechar } = await construirAppTeste();
  t.after(fechar);

  // Rota exclusiva do teste para forçar um erro não tratado (500).
  app.get('/api/rota-com-erro-para-teste', async () => {
    throw new Error('segredo-interno');
  });
  await app.ready();

  const resposta = await app.inject({ method: 'GET', url: '/api/rota-com-erro-para-teste' });

  assert.equal(resposta.statusCode, 500);
  const corpo = resposta.json();
  assert.equal(corpo.erro, 'interno');
  assert.equal(corpo.requestId, resposta.headers['x-request-id']);
  assert.ok(!resposta.body.includes('segredo-interno'));
  assert.ok(!resposta.body.includes('stack'));
});

test('CA4 (proposto): rota inexistente responde 404 com erro nao_encontrado', async (t) => {
  const { app, fechar } = await construirAppTeste();
  t.after(fechar);

  const resposta = await app.inject({ method: 'GET', url: '/api/inexistente' });

  assert.equal(resposta.statusCode, 404);
  assert.deepEqual(resposta.json(), { erro: 'nao_encontrado' });
});

test('CA4: POST /api/exemplos não existe fora de desenvolvimento (NODE_ENV=production)', async (t) => {
  const { app, fechar } = await construirAppTeste({ sobrescritasConfig: { nodeEnv: 'production' } });
  t.after(fechar);

  const resposta = await app.inject({
    method: 'POST',
    url: '/api/exemplos',
    payload: { titulo: 'Teste', quantidade: 2 },
  });

  assert.equal(resposta.statusCode, 404);
});
