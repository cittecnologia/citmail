import pg from 'pg'

// Pool do PostgreSQL. Tempos limite curtos para o health responder rápido
// quando o banco está fora. Consultas sempre parametrizadas ($1, $2...).
export function criarPool(databaseUrl, log) {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 5,
    connectionTimeoutMillis: 2000,
    query_timeout: 2000
  })
  // Erro de cliente ocioso: só o código, nunca a mensagem (pode ter host/usuário).
  pool.on('error', (erro) => {
    log?.warn({ codigo: erro.code ?? 'desconhecido' }, 'erro no pool do banco')
  })
  return pool
}

export async function verificarBanco(pool) {
  await pool.query('SELECT 1')
}
