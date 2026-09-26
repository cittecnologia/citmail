# 0011. Canal de alerta da equipe

Status: aceito
Data: 2026-09-25

## Contexto

Decidido pelo responsável em 2026-09-25: os alertas da equipe (falha de job esgotado, falha de backup, queda de disponibilidade, cobrança vencida, cancelamento) saem para um grupo do Telegram, por bot. Usado por E2-H7 (falha de backup), E2-H10 (job esgotado), E2-H11 (queda de disponibilidade), E4-H2 (falha de provisionamento), E4-H4 (renovação de domínio) e E5-H10 (cancelamento solicitado).

## Opções consideradas

### Opção 1: Bot do Telegram, por job da fila
Um job dedicado de alerta, consumido pela fila (ADR 0005), que envia mensagem a um grupo do Telegram via bot, com token do bot como segredo e limite de mensagens por minuto.

### Opção 2: E-mail (descartada)
Alertas por e-mail para a equipe, pelo mesmo canal do ADR 0010.

### Opção 3: Slack ou Discord (descartada)
Um canal de mensagens de equipe em Slack ou Discord, com webhook de entrada.

## Decisão

Grupo do Telegram com bot (decidido). Envio por job da fila, mensagem sem dado pessoal (só ids e tipo do alerta), token do bot como segredo, limite de mensagens por minuto (proposto).

## Justificativa

- **Notificação imediata no celular:** Telegram entrega notificação push instantânea sem depender de a equipe estar com a caixa de e-mail aberta, ao contrário do e-mail (Opção 2), que é assíncrono por natureza e compete com outras mensagens.
- **Sem contratação nem provisionamento adicional:** um bot do Telegram é criado em minutos e não exige assinatura paga nem workspace novo, ao contrário de Slack ou Discord (Opção 3), que exigiriam criar e manter um espaço de equipe só para isso.
- **Reaproveita a fila:** o alerta sai por job da fila, como qualquer outro evento (ADR 0005), o que dá o mesmo reprocessamento e não bloqueia a requisição original em caso de lentidão do Telegram.

Exemplo ilustrativo:

```js
await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    chat_id: process.env.TELEGRAM_CHAT_ID,
    text: `Job falhou: id=${job.id} pedido=${job.pedidoId}`
  })
})
```

## Consequências

- O token do bot e o id do grupo (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`) ficam como segredo, nunca no repositório (regra da CIT-46).
- A mensagem de alerta nunca leva dado pessoal (nome, e-mail, CPF/CNPJ) — só ids internos e o tipo do alerta, para que o grupo do Telegram não vire um repositório de dado sensível.
- Um limite de mensagens por minuto evita que uma falha em cascata (ex.: Redis fora do ar) inunde o grupo; alertas além do limite são agregados ou descartados com contagem.
- Trocar de canal no futuro (ex.: se a equipe crescer e precisar de escalonamento por plantão) exige revisar este ADR.

## Revisões

- 2026-09-25: criação (CIT-47).
