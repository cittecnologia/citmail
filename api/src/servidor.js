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
    let codigo = 0
    try {
      await app.close()
    } catch (erro) {
      codigo = 1
      app.log.error({ err: erro }, 'falha ao encerrar')
    } finally {
      process.exit(codigo)
    }
  })
}

try {
  await app.listen({ host: config.host, port: config.port })
} catch (erro) {
  app.log.error({ err: erro }, 'falha ao iniciar')
  process.exit(1)
}
