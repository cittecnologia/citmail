# 0005. Fila de jobs e eventos de domínio

Status: proposto
Data: 2026-09-25

## Contexto

Decidido pelo responsável em 2026-09-25: a fila é Redis + BullMQ, não RabbitMQ. O Redis pode também servir a sessão do painel (ADR 0008) e o limite de taxa, se justificado. A fila precisa suportar reprocessamento com backoff e alerta de falha (E2-H10), e ser a base para os eventos de domínio que os épicos E3 a E5 emitem e o E7 consome para enviar e-mail (briefing, risco "webhooks do Asaas com falha ou atraso"). A lista completa de eventos, com emissor, consumidor, payload e chave de idempotência, fica no anexo `anexos/eventos-de-dominio.md`.

A principal entrada de eventos é o webhook do Asaas (E3-H4). Ele muda estado de pedido e de conta, então precisa de autenticação e de conferência antes de agir.

## Opções consideradas

### Opção 1: Publicar direto após o commit
Ao confirmar uma mudança de estado no banco (ex.: pedido pago), a API publica o evento na fila logo em seguida, na mesma requisição ou job.

### Opção 2: Outbox simples
A gravação do evento na tabela `evento` acontece na mesma transação da mudança de estado; um processo separado lê a tabela `evento` e publica na fila do BullMQ depois.

## Decisão

**Decidido pelo responsável em 2026-09-25:** Redis + BullMQ.

**Proposto:**

1. **Outbox simples (Opção 2).** O evento é gravado na tabela `evento` na mesma transação da mudança de estado. Um publicador lê a tabela e envia à fila depois do commit.
2. **Tabela `evento`** (anexo de modelo de dados): `id` UUID (é o `eventoId`), `nome`, `agregado_tipo` e `agregado_id`, `chave_idempotencia` com restrição única, `payload`, `publicado_em`.
3. **Chave de idempotência por fato de negócio**, não pelo id do evento externo. Ex.: `pedido_pago-<pedidoId>`, `cobranca_paga-<cobrancaAsaasId>`. O Asaas manda `PAYMENT_CONFIRMED` e `PAYMENT_RECEIVED` com ids diferentes para o mesmo pagamento; a chave pelo id do evento do Asaas deixaria passar os dois. Lista completa no anexo de eventos.
4. **Um job por consumidor.** Cada consumidor recebe o evento num job próprio, com `jobId = <consumidor>-<eventoId>`. Separador hífen: o BullMQ pode rejeitar `:` em `jobId` customizado.
5. **Novas tentativas com backoff.** Tentativas esgotadas levam o job a "falhou" e geram alerta (ADR 0011).
6. **Webhook do Asaas (E3-H4):**
   - Exige o cabeçalho `asaas-access-token`, comparado em tempo constante (`crypto.timingSafeEqual`) com o token configurado. Ausente ou diferente: 401, nada gravado.
   - Grava o evento bruto (tabela própria, única pelo id do evento do Asaas) e responde 200. O processamento segue em job.
   - Antes de mudar estado, o job consulta o pagamento na API do Asaas e confere pagamento, valor e pedido (assinatura ligada ao pedido). Divergência: não muda estado, gera alerta.
   - Evento bruto com dados pessoais minimizados (LGPD): guarda só os campos usados (ids, tipo, estado, valor, datas); descarta nome, e-mail, documento e endereço do payload antes de gravar.
   - Retenção do evento bruto: proposta de 90 dias, depois apagado (a confirmar; ver "Decisões em aberto" do README).

Exemplo ilustrativo do outbox:

```sql
BEGIN;
UPDATE pedido SET estado = 'pago' WHERE id = $1 AND estado = 'aguardando_pagamento';
INSERT INTO evento (id, nome, agregado_tipo, agregado_id, chave_idempotencia, payload)
VALUES ($2, 'pedido_pago', 'pedido', $1, 'pedido_pago-' || $1, $3)
ON CONFLICT (chave_idempotencia) DO NOTHING;
COMMIT;
-- o publicador lê "evento" e cria um job por consumidor: jobId = '<consumidor>-' || evento.id
```

## Justificativa

- **Sem perda se o Redis cair:** publicar direto após o commit (Opção 1) tem uma janela em que o banco já mudou de estado, mas a fila nunca recebeu o evento, se o Redis estiver indisponível nesse instante — justamente o cenário que motiva esta decisão (risco do briefing sobre falha de webhook). O outbox evita essa janela: o evento já está persistido no banco antes de qualquer tentativa de publicação.
- **Idempotência dupla:** a restrição única em `chave_idempotencia` impede gravar o mesmo fato duas vezes, mesmo com webhook repetido ou com dois eventos do Asaas para o mesmo pagamento (E3-H4). O `jobId` determinístico evita dois jobs do mesmo consumidor para o mesmo evento.
- **Um job por consumidor:** a falha de um consumidor (ex.: e-mail) não reprocessa os outros (ex.: provisionamento).
- **Webhook autenticado e conferido:** o token barra chamadas forjadas; a consulta ao Asaas barra um evento com token vazado ou dados adulterados, antes de provisionar serviço sem pagamento.
- **Reprocessamento visível:** o BullMQ oferece backoff configurável e um painel de jobs "falhados", o que atende E2-H10 (job esgotado vai para "falhou" e gera alerta) sem construir esse controle manualmente.

## Consequências

- Um processo (ou job agendado) precisa ler a tabela `evento` e publicar na fila; se esse processo parar, os eventos ficam represados no banco, não perdidos — comportamento aceito neste ADR.
- Todo consumidor de evento precisa ser preparado para receber o mesmo evento mais de uma vez (idempotência na ponta consumidora também, não só na emissora).
- Redis com persistência AOF (`appendonly yes`) e `maxmemory-policy noeviction` (exigência do BullMQ), configurado no ADR 0006.
- Cada webhook gera uma chamada de volta à API do Asaas, sujeita ao limite de requisições dele.
- Add-ons e provisionamento: os eventos ligados a add-ons dependem de quais a API da Skymail realmente suporta.

## Revisões

- 2026-09-25: criação (CIT-47).
- 2026-09-25: ajustes da revisão (CIT-47).
- Revisão prevista pela #48 (PoC Skymail): eventos e payloads ligados a add-ons e provisionamento.
