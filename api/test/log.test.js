import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construirAppTeste } from './auxiliares.js';

test('CA8: as linhas padrão de início e fim da requisição trazem o mesmo reqId do x-request-id', async (t) => {
  const { app, captura, fechar } = await construirAppTeste();
  t.after(fechar);

  const resposta = await app.inject({ method: 'GET', url: '/api/health' });
  const requestId = resposta.headers['x-request-id'];

  const linhasDaRequisicao = captura.linhas().filter((linha) => linha.reqId === requestId);
  assert.ok(linhasDaRequisicao.length > 0, 'era esperado ao menos um log com o reqId da requisição');

  const linhaInicio = linhasDaRequisicao.find((linha) => linha.msg === 'incoming request');
  const linhaFim = linhasDaRequisicao.find((linha) => linha.msg === 'request completed');

  assert.ok(linhaInicio, 'era esperado o log padrão "incoming request" com o reqId da requisição');
  assert.ok(linhaFim, 'era esperado o log padrão "request completed" com o reqId da requisição');
});

test('CA8: campos sensíveis do log saem mascarados como "[mascarado]"', async (t) => {
  const { app, captura, fechar } = await construirAppTeste();
  t.after(fechar);

  // Log sobre o logger real do app (não um objeto pino à parte), como exige
  // o plano: `app.log` é o mesmo logger configurado por `construirApp`, com
  // `redact` já aplicado.
  app.log.info({ senha: 'x', dados: { email: 'a@b.c' } }, 'log de teste com dado sensível');

  const linhaComSenha = captura.linhas().find((linha) => linha.senha !== undefined);

  assert.ok(linhaComSenha, 'era esperada uma linha de log com o campo senha');
  assert.equal(linhaComSenha.senha, '[mascarado]');
  assert.equal(linhaComSenha.dados?.email, '[mascarado]');
});

test('Revisão: erro do pg (detail/where/parameters) sai mascarado no log de erro', async (t) => {
  const { app, captura, fechar } = await construirAppTeste();
  t.after(fechar);

  // Rota exclusiva do teste: simula um erro real do driver `pg` (ex.:
  // violação de unicidade), que traz dados da linha nesses campos.
  app.get('/api/rota-com-erro-pg-para-teste', async () => {
    const erro = new Error('duplicate key value violates unique constraint');
    erro.detail = 'Key (email)=(a@b.c) already exists.';
    erro.where = 'SQL statement "INSERT INTO clientes ..."';
    erro.parameters = ['a@b.c', '11999999999'];
    throw erro;
  });
  await app.ready();

  const resposta = await app.inject({ method: 'GET', url: '/api/rota-com-erro-pg-para-teste' });
  assert.equal(resposta.statusCode, 500);

  const linhaDeErro = captura.linhas().find((linha) => linha.level === 50 && linha.err);

  assert.ok(linhaDeErro, 'era esperado um log de erro (level 50) com o campo err');
  assert.equal(linhaDeErro.err.detail, '[mascarado]');
  assert.equal(linhaDeErro.err.where, '[mascarado]');
  assert.equal(linhaDeErro.err.parameters, '[mascarado]');
});
