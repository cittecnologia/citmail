// Lê e valida a configuração da API a partir das variáveis de ambiente.
// As mensagens de erro citam o nome da variável, nunca o valor.

const AMBIENTES = ['production', 'development', 'test']

function origemExata(origem) {
  try {
    return new URL(origem).origin === origem
  } catch {
    return false
  }
}

export function carregarConfig(env = process.env) {
  const databaseUrl = (env.DATABASE_URL ?? '').trim()
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não definida')
  }

  const corsOrigens = (env.CORS_ORIGENS ?? '')
    .split(',')
    .map((origem) => origem.trim())
    .filter(Boolean)
  if (corsOrigens.length === 0) {
    throw new Error('CORS_ORIGENS vazia: informe a lista exata de origens permitidas')
  }
  if (corsOrigens.some((origem) => origem.includes('*'))) {
    throw new Error('CORS_ORIGENS não aceita curinga (*): informe as origens exatas')
  }
  if (!corsOrigens.every(origemExata)) {
    throw new Error('CORS_ORIGENS inválida: cada item deve ser uma origem exata (esquema://host[:porta], sem caminho nem barra final)')
  }

  // Ausente vira production (falha fechada): nada de rota de desenvolvimento por esquecimento.
  const nodeEnv = env.NODE_ENV || 'production'
  if (!AMBIENTES.includes(nodeEnv)) {
    throw new Error('NODE_ENV inválida: use production, development ou test')
  }

  const porta = Number(env.PORT || 3000)
  if (!Number.isInteger(porta) || porta < 0 || porta > 65535) {
    throw new Error('PORT inválida')
  }

  return {
    databaseUrl,
    host: env.HOST || '127.0.0.1',
    port: porta,
    corsOrigens,
    logLevel: env.LOG_LEVEL || 'info',
    nodeEnv
  }
}
