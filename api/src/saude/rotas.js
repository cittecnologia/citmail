import { verificarBanco } from '../banco.js'

const corpoSaude = {
  type: 'object',
  required: ['status', 'banco'],
  additionalProperties: false,
  properties: {
    status: { type: 'string', enum: ['ok', 'indisponivel'] },
    banco: { type: 'string', enum: ['ok', 'indisponivel'] }
  }
}

export default async function rotasSaude(app, { pool }) {
  app.get('/api/health', {
    schema: { response: { 200: corpoSaude, 503: corpoSaude } }
  }, async (request, reply) => {
    reply.header('cache-control', 'no-store')
    try {
      await verificarBanco(pool)
      return { status: 'ok', banco: 'ok' }
    } catch (erro) {
      // Só o código do erro: a mensagem do driver pode trazer host, porta ou usuário.
      request.log.warn({ codigo: erro?.code ?? 'desconhecido' }, 'banco indisponível no health')
      return reply.code(503).send({ status: 'indisponivel', banco: 'indisponivel' })
    }
  })
}
