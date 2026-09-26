# 0005. Fila de jobs e eventos de domínio

Status: proposto
Data: 2026-09-25

## Contexto

Decidido pelo responsável em 2026-09-25: a fila é Redis + BullMQ, não RabbitMQ. O Redis pode também servir a sessão do painel (ADR 0008) e o limite de taxa, se justificado. A fila precisa suportar reprocessamento com backoff e alerta de falha (E2-H10), e ser a base para os eventos de domínio que os épicos E3 a E5 emitem e o E7 consome para enviar e-mail (briefing, risco "webhooks do Asaas com falha ou atraso"). A lista completa de eventos, com emissor, consumidor e payload, fica no anexo `anexos/eventos-de-dominio.md`.

## Opções consideradas

### Opção 1: Publicar direto após o commit
Ao confirmar uma mudança de estado no banco (ex.: pedido pago), a API publica o evento na fila logo em seguida, na mesma requisição ou job.

### Opção 2: Outbox simples
A gravação do evento na tabela `evento` acontece na mesma transação da mudança de estado; um processo separado lê a tabela `evento` e publica na fila do BullMQ depois.

## Decisão

Redis + BullMQ (decidido). Outbox simples: evento gravado na tabela `evento` na mesma transação da mudança de estado, publicação na fila depois; idempotência por chave (`jobId` determinístico do BullMQ + restrição única no banco); novas tentativas com backoff; tentativas esgotadas geram alerta (ADR 0011) (proposto).

## Justificativa

- **Sem perda se o Redis cair:** publicar direto após o commit (Opção 1) tem uma janela em que o banco já mudou de estado, mas a fila nunca recebeu o evento, se o Redis estiver indisponível nesse instante — justamente o cenário que motiva esta decisão (risco do briefing sobre falha de webhook). O outbox evita essa janela: o evento já está persistido no banco antes de qualquer tentativa de publicação.
- **Idempotência dupla:** o `jobId` determinístico do BullMQ evita duas execuções do mesmo job; a restrição única no banco (ex.: em `pedido_id` + tipo de evento) é a segunda barreira, para o caso de o mesmo evento externo (webhook do Asaas) chegar duplicado, como exige E3-H4.
- **Reprocessamento visível:** o BullMQ oferece backoff configurável e um painel de jobs "falhados", o que atende E2-H10 (job esgotado vai para "falhou" e gera alerta) sem construir esse controle manualmente.

Exemplo ilustrativo do outbox:

```sql
BEGIN;
UPDATE pedido SET status = 'pago' WHERE id = $1;
INSERT INTO evento (tipo, payload, pedido_id) VALUES ('pedido_pago', $2, $1);
COMMIT;
-- processo separado lê "evento" e publica no BullMQ com jobId = evento.id
```

## Consequências

- Um processo (ou job agendado) precisa ler a tabela `evento` e publicar na fila; se esse processo parar, os eventos ficam represados no banco, não perdidos — comportamento aceito neste ADR.
- Todo consumidor de evento precisa ser preparado para receber o mesmo evento mais de uma vez (idempotência na ponta consumidora também, não só na emissora).
- Redis com persistência AOF, para não perder jobs pendentes num reinício (ver ADR 0006/0013).

Add-ons e provisionamento: os eventos ligados a add-ons dependem de quais a API da Skymail realmente suporta.

Revisão prevista pela #48 (PoC Skymail).

## Revisões

- 2026-09-25: criação (CIT-47).
