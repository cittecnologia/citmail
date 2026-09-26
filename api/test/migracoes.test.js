import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client } from 'pg';
import { criarBancoTemporario, removerBancoTemporario, aplicarMigracoes } from './auxiliares.js';

async function contar(url, sql, parametros = []) {
  const cliente = new Client({ connectionString: url });
  await cliente.connect();
  try {
    const resultado = await cliente.query(sql, parametros);
    return resultado.rowCount;
  } finally {
    await cliente.end();
  }
}

function funcaoDefinirAtualizadoEmExiste(url) {
  return contar(url, 'SELECT 1 FROM pg_proc WHERE proname = $1', ['definir_atualizado_em']);
}

async function linhasEmPgmigrations(url) {
  const cliente = new Client({ connectionString: url });
  await cliente.connect();
  try {
    const resultado = await cliente.query('SELECT count(*)::int AS total FROM pgmigrations');
    return resultado.rows[0].total;
  } finally {
    await cliente.end();
  }
}

test('CA3: aplica, reverte e reaplica todas as migrações num banco vazio sem erro', async (t) => {
  const { nomeBanco, url } = await criarBancoTemporario();
  t.after(() => removerBancoTemporario(nomeBanco));

  await assert.doesNotReject(
    aplicarMigracoes(url, 'up', Infinity),
    'aplicar (up) não deveria rejeitar',
  );
  assert.equal(await funcaoDefinirAtualizadoEmExiste(url), 1, 'função definir_atualizado_em deveria existir após up');

  await assert.doesNotReject(
    aplicarMigracoes(url, 'down', Infinity),
    'reverter (down) não deveria rejeitar',
  );
  assert.equal(await funcaoDefinirAtualizadoEmExiste(url), 0, 'função definir_atualizado_em não deveria existir após down');
  assert.equal(await linhasEmPgmigrations(url), 0, 'pgmigrations deveria ficar sem linhas após down completo');

  await assert.doesNotReject(
    aplicarMigracoes(url, 'up', Infinity),
    'reaplicar (up) não deveria rejeitar',
  );
  assert.equal(await funcaoDefinirAtualizadoEmExiste(url), 1, 'função definir_atualizado_em deveria existir após reaplicar');
});
