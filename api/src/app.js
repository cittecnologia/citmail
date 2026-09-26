import { randomUUID } from 'node:crypto'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { criarPool } from './banco.js'
import { registrarErros } from './erros.js'
import rotasSaude from './saude/rotas.js'
import rotasExemplo from './exemplo/rotas.js'

// Campos mascarados no log (ADR 0013, item 8): raiz, um e dois níveis.
const sensiveis = ['senha', 'token', 'email', 'telefone', 'nome', 'cpf', 'cnpj', 'documento']
const caminhosMascarados = [
  ...sensiveis,
  ...sensiveis.map((campo) => `*.${campo}`),
  ...sensiveis.map((campo) => `*.*.${campo}`),
  'req.headers.cookie',
  'req.headers.authorization',
  'req.headers["asaas-access-token"]',
  'res.headers["set-cookie"]'
]

export function construirApp(config, { pool, logStream } = {}) {
  const origens = config?.corsOrigens
  if (!Array.isArray(origens) || origens.length === 0 || origens.some((o) => !o || o.includes('*'))) {
    throw new Error('CORS_ORIGENS inválida: informe a lista exata de origens permitidas')
  }

  const app = Fastify({
    logger: {
      level: config.logLevel ?? 'info',
      redact: { paths: caminhosMascarados, censor: '[mascarado]' },
      ...(logStream ? { stream: logStream } : {})
    },
    genReqId: () => randomUUID(),
    requestIdHeader: false,
    trustProxy: '127.0.0.1',
    bodyLimit: 65536,
    ajv: { customOptions: { allErrors: true, removeAdditional: false } }
  })

  // O app só fecha o pool que ele mesmo criou; pool injetado é de quem o criou.
  const poolProprio = !pool
  const poolBanco = pool ?? criarPool(config.databaseUrl, app.log)
  if (poolProprio) {
    app.addHook('onClose', async () => {
      await poolBanco.end()
    })
  }

  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id)
  })

  app.register(cors, {
    origin: origens,
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: false
  })

  registrarErros(app)
  app.register(rotasSaude, { pool: poolBanco })
  if (config.nodeEnv !== 'production') {
    app.register(rotasExemplo)
  }

  return app
}
