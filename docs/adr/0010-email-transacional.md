# 0010. Canal do e-mail transacional

Status: proposto
Data: 2026-09-25

## Contexto

Decidido pelo responsável em 2026-09-25: o e-mail transacional (confirmação de compra, credenciais iniciais, avisos de vencimento e cancelamento) sai por SMTP da Skymail, com remetente de um domínio da CITMail. A história E7-H1 pede um serviço único de envio, com modelos (HTML e texto), reenvio em falha e registro sem dado sensível.

## Opções consideradas

### Opção 1: SMTP da Skymail com `nodemailer`, via job da fila
Envio só por job da fila (E7-H1), usando `nodemailer` configurado para o SMTP da Skymail, com modelos de e-mail versionados no repositório da API e reenvio pelo mecanismo de retentativa do BullMQ (ADR 0005).

### Opção 2: Provedor transacional dedicado (descartada)
Um provedor especializado em e-mail transacional (ex.: SES, SendGrid, Postmark), com API própria de envio e métricas de entrega.

### Opção 3: SMTP próprio (descartada)
Servidor SMTP próprio rodando na VPS da CIT, sem depender de terceiro.

## Decisão

**Decidido pelo responsável em 2026-09-25:** SMTP da Skymail, remetente de um domínio da CITMail.

**Proposto:**

- Envio só por job da fila com `nodemailer`, modelos versionados e reenvio (ADR 0005).
- Modelos HTML com escape automático de todo dado interpolado (nome, endereço de caixa, domínio); nenhum dado entra como HTML cru. Versão em texto sem HTML.
- DMARC do domínio remetente em `p=none` com relatórios no início; depois de um período sem falhas de SPF e DKIM (proposta: 30 dias), passar a `p=quarantine`.

## Justificativa

- **Um só provedor de e-mail:** a Skymail já é o provedor de caixas de e-mail e domínio (E4); usar o mesmo SMTP para transacional evita contratar e manter um segundo fornecedor (provedor dedicado, Opção 2) só para esse fim, e evita o esforço de rodar e reputar um SMTP próprio (Opção 3), que teria entrega pior sem histórico de reputação.
- **Job da fila, não envio síncrono:** enviar dentro do job que processa o evento (ex.: `pedido_pago` → e-mail de confirmação) reaproveita o reprocessamento com backoff e o alerta de falha esgotada já decididos no ADR 0005, sem duplicar essa lógica no envio de e-mail.
- **Escape nos modelos:** nome e domínio vêm do cliente; sem escape, um valor com HTML mudaria o conteúdo do e-mail (injeção de HTML, link falso).
- **DMARC em etapas:** `p=none` mostra nos relatórios se algum envio legítimo falha antes de punir; `p=quarantine` depois reduz a falsificação do remetente.
- **Modelos versionados:** manter os modelos HTML/texto no repositório da API (e não numa interface externa) os coloca sob revisão de PR, como qualquer outro código.

Exemplo ilustrativo:

```js
const transportador = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
})
await transportador.sendMail({
  from: 'CITMail <naoresponda@citmail.com.br>',
  to: destinatario,
  subject: assuntoDoModelo,
  html: renderizarModelo('confirmacao-compra', dados)
})
```

## Consequências

- O domínio remetente precisa de registros SPF, DKIM e DMARC válidos (E7-H1), como consequência direta de enviar pelo SMTP da Skymail com remetente próprio.
- A credencial SMTP fica em arquivo `chmod 600` no servidor ou em environment do GitHub, nunca no repositório (regra da CIT-46); a chave da Skymail em si permanece no gerenciador de senhas até haver consumidor (CIT-46/E2-H8).
- O registro de cada envio guarda destinatário mascarado, modelo, estado e data — nunca o conteúdo do e-mail (E7-H1).
- Trocar de provedor de e-mail no futuro exige rever este ADR e o registro DNS de SPF/DKIM/DMARC, não só a configuração do `nodemailer`.

## Revisões

- 2026-09-25: criação (CIT-47).
- 2026-09-25: ajustes da revisão (CIT-47).
