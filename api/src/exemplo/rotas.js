// Endpoint de exemplo (só fora de produção, sem efeito colateral): fixa o padrão
// de schema por rota e de erro 400 por campo.

const corpoExemplo = {
  type: 'object',
  required: ['titulo', 'quantidade'],
  additionalProperties: false,
  properties: {
    titulo: { type: 'string', minLength: 1, maxLength: 80 },
    quantidade: { type: 'integer', minimum: 1, maximum: 10 }
  }
}

export default async function rotasExemplo(app) {
  app.post('/exemplos', {
    schema: { body: corpoExemplo, response: { 200: corpoExemplo } }
  }, async (request) => {
    return { titulo: request.body.titulo, quantidade: request.body.quantidade }
  })
}
