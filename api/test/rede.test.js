import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import { Client } from 'pg';
import { urlAdminTeste } from './auxiliares.js';

test('CA6: fetch para host externo rejeita com ERR_REDE_BLOQUEADA em menos de 1s', async () => {
  const inicio = Date.now();

  await assert.rejects(fetch('https://example.com'), (erro) => {
    assert.equal(erro.cause?.code, 'ERR_REDE_BLOQUEADA');
    return true;
  });

  assert.ok(Date.now() - inicio < 1000);
});

test('CA6: net.connect para host externo rejeita com ERR_REDE_BLOQUEADA em menos de 1s', async () => {
  const inicio = Date.now();

  await new Promise((resolve, rejeitar) => {
    const socket = net.connect(443, '93.184.215.14');
    socket.once('error', (erro) => {
      try {
        assert.equal(erro.code, 'ERR_REDE_BLOQUEADA');
        resolve();
      } catch (erroDeAsserção) {
        rejeitar(erroDeAsserção);
      }
    });
    socket.once('connect', () => rejeitar(new Error('conexão não deveria ter sido estabelecida')));
  });

  assert.ok(Date.now() - inicio < 1000);
});

test('CA6: conexão pg ao banco de teste no loopback funciona normalmente', async () => {
  const cliente = new Client({ connectionString: urlAdminTeste() });
  await cliente.connect();
  try {
    const resultado = await cliente.query('SELECT 1');
    assert.equal(resultado.rows[0]['?column?'], 1);
  } finally {
    await cliente.end();
  }
});
