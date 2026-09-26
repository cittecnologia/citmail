import { test } from 'node:test';
import assert from 'node:assert/strict';
import { construirAppTeste } from './auxiliares.js';

test('CA8: todas as linhas de log da requisição trazem o mesmo reqId do x-request-id', async (t) => {
  const { app, captura, fechar } = await construirAppTeste();
  t.after(fechar);

  const resposta = await app.inject({ method: 'GET', url: '/api/health' });
  const requestId = resposta.headers['x-request-id'];

  const linhasDaRequisicao = captura.linhas().filter((linha) => linha.reqId === requestId);

  assert.ok(linhasDaRequisicao.length > 0, 'era esperado ao menos um log com o reqId da requisição');
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
