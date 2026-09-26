import { carregarConfig } from './config.js'
import { construirApp } from './app.js'

let config
try {
  config = carregarConfig()
} catch (erro) {
  console.error(`Configuração inválida: ${erro.message}`)
  process.exit(1)
}

const app = construirApp(config)

for (const sinal of ['SIGTERM', 'SIGINT']) {
  process.once(sinal, async () => {
    app.log.info({ sinal }, 'encerrando')
    await app.close()
    process.exit(0)
  })
}

try {
  await app.listen({ host: config.host, port: config.port })
} catch (erro) {
  app.log.error({ err: erro }, 'falha ao iniciar')
  process.exit(1)
}
