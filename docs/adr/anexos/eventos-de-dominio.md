# Eventos de domínio

Anexo de referência do ADR [0005](../0005-fila-e-eventos-de-dominio.md) (fila e eventos). Parte da tabela de eventos de `.omc/plans/epicos-citmail.md` e foi conferido contra os critérios de aceite de E3 a E7. Entidades e estados no anexo [modelo-de-dados.md](modelo-de-dados.md).

Data: 2026-09-25

## Envelope comum

Todo evento leva, além do payload mínimo da tabela:

| Campo | Conteúdo |
|---|---|
| `eventoId` | id da linha na tabela `evento` (UUID) |
| `nome` | nome do evento, em `snake_case` |
| `versao` | versão do payload, começa em `1` |
| `ocorridoEm` | data e hora UTC da mudança de estado |
| `requestId` | id de correlação da requisição ou do job que originou o evento (ADR 0013) |

Payload só com ids e dados não pessoais. Sem nome, e-mail, documento, telefone, domínio do cliente, senha, token ou chave. O consumidor lê o que precisa no banco pelo id.

## Tabela de eventos

| nome | emite (história) | consome (histórias) | payload mínimo | chave de idempotência |
|---|---|---|---|---|
| `pedido_pago` | E3-H4 | E4-H2, E7-H2 | `pedidoId`, `clienteId`, `assinaturaId` (contas), `ciclo`, `temDominioNovo` | id do evento do Asaas (webhook); no máximo um por `pedidoId` |
| `dominio_pago` | E3-H4 | E4-H4 | `pedidoId`, `assinaturaId` (domínios), `temDominioNovo` | id do evento do Asaas (webhook) |
| `conta_titular_criada` | E3-H4 | E5-H2 | `contaId`, `clienteId`, `pedidoId` | `contaId` (a conta nasce uma vez) |
| `cobranca_vencida` | E3-H4 | E4-H5 | `clienteId`, `assinaturaId`, `cobrancaAsaasId`, `vencimento` | id do evento do Asaas (webhook) |
| `definicao_senha_solicitada` | E5-H2 | E7-H3 | `contaId`, `tipo` (`primeiro_acesso` ou `redefinicao`), `solicitacaoId`, `expiraEm` | `solicitacaoId` |
| `conta_ativada` | E4-H2 | E7-H3, E7-H5, E4-H7 | `pedidoId`, `contaId`, `caixaIds`, `dnsPendente` (provisório (#48)) | `pedidoId` + estado `ativo` |
| `dominio_verificado` | E4-H3 | E7-H5 | `pedidoId`, `verificadoEm`; referência do domínio na Skymail: provisório (#48) | `pedidoId` + `dominio_verificado` (uma vez por domínio) |
| `conta_suspensa` | E4-H5 | E7-H6 | `contaId`, `cobrancaAsaasId`, `motivo` (`inadimplencia`); ids das caixas na Skymail: provisório (#48) | `contaId` + `suspensa` + `cobrancaAsaasId` |
| `conta_reativada` | E4-H5 | E7-H6 | `contaId`, `cobrancaAsaasId`; ids das caixas na Skymail: provisório (#48) | `contaId` + `reativada` + `cobrancaAsaasId` |
| `cancelamento_solicitado` | E5-H10 | E7-H8; E3-H7 (pos-mvp) | `contaId`, `assinaturaIds`, `protocolo`, `encerraEm` | `protocolo` |
| `assinatura_cancelada` (nome proposto, a confirmar) | E3-H7 (pos-mvp) | E4 e E7 (histórias a criar) | `assinaturaId`, `pedidoId`, `contaId`, `canceladaEm`, `houveReembolso` | `assinaturaId` + `cancelada` |
| `cobranca_paga` (nome proposto, a confirmar) | E3-H4 | E4-H5 | `clienteId`, `assinaturaId`, `cobrancaAsaasId` | id do evento do Asaas (webhook) |

## Regras

- **Entrega pelo outbox (ADR 0005).** O evento é gravado na tabela `evento` na mesma transação da mudança de estado. O publicador envia à fila depois do commit e marca `publicado_em`. Se o Redis cair, o evento continua no banco e sai na próxima varredura.
- **Um job por consumidor.** Cada consumidor recebe o evento num job próprio, com `jobId` determinístico (`<nome do consumidor>:<eventoId>`). Falha de um consumidor não reprocessa os outros.
- **Emissor idempotente.** A restrição única em `chave_idempotencia` impede gravar o mesmo evento duas vezes.
- **Consumidor idempotente.** Antes do efeito (e-mail, chamada à Skymail, tarefa), o consumidor confere se já processou o `eventoId`. Efeito externo consulta antes de criar (E4-H1).
- **Webhook duplicado.** O Asaas pode reenviar o mesmo evento. O webhook grava o evento bruto e responde 200; a chave do evento do Asaas faz a segunda entrega virar nada (E3-H4).
- **Reprocessamento.** Job com erro volta com backoff. O comando de reprocessamento (E2-H10) reenfileira o mesmo `jobId`; a idempotência evita efeito duplo.
- **Tentativas esgotadas.** O job vai para "falhou" e a equipe recebe alerta no canal do ADR 0011, só com ids (`eventoId`, `pedidoId`, nome do job).
- **Quem emite não envia e-mail.** E-mail é sempre efeito de um consumidor do E7 (E7-H1, ADR 0010).
- **Mudança de payload.** Campo novo é compatível; remover ou renomear campo sobe `versao` e exige consumidor que aceite as duas versões durante a transição.

## Divergências encontradas na conferência

1. **Evento de desativação sem nome (E3-H7).** A história publica "o evento de desativação", consumido por E4 e E7, mas nenhuma história do E4 ou do E7 o consome hoje (E7-H8 remete o e-mail de cancelamento efetivado à E3-H7). Nome proposto: `assinatura_cancelada`. Falta decidir se o cancelamento feito pela equipe no mvp também o publica.
2. **`conta_suspensa` e `conta_reativada` numa linha só.** Separados em duas linhas, com chave própria.
3. **Reativação sem evento de entrada.** E4-H5 reativa quando "chega o pagamento confirmado da cobrança em atraso", mas a tabela base não tem esse evento e E3-H4 só publica `pedido_pago` para a fatura das contas. Reusar `pedido_pago` dispararia de novo o provisionamento (E4-H2) e o e-mail de compra (E7-H2). Proposta: `pedido_pago` só no primeiro pagamento do pedido e `cobranca_paga` (nome proposto) para os pagamentos seguintes. Exige critério novo em E3-H4.
4. **Token de senha no payload.** E5-H2 gera o token e publica `definicao_senha_solicitada`; E7-H3 precisa do link. O token não pode ir para a tabela `evento` nem para a fila. Proposta: o payload leva só `solicitacaoId`, e o job de e-mail gera o token no envio e grava só o hash. Ajustar o critério 1 de E5-H2 na #53 ou na própria história.
5. **`dominio_pago` também para domínio extra existente.** A assinatura anual de domínios cobre domínio novo e extra (E3-H2). E4-H4 só trata domínio novo; o extra existente entra na ativação de E4-H7, via `conta_ativada`. O consumidor de E4-H4 ignora o evento quando `temDominioNovo` é falso.
6. **Ordem entre `pedido_pago` e `dominio_pago`.** São faturas separadas e podem chegar em qualquer ordem. Com domínio novo, o pedido só vai a `aguardando_registro_de_dominio` depois de `pedido_pago`; o consumidor de E4-H4 precisa tratar o caso de o pedido ainda estar `aguardando_pagamento`.
7. **Nome `conta_ativada`.** O evento marca o fim do provisionamento do pedido (E4-H2), não a passagem da conta do titular para `ativa` (que acontece quando a senha é definida). Manter o nome da base, com essa definição, ou renomear para `pedido_ativado`: a confirmar.
8. **Domínio novo registrado pela equipe.** E4-H4 enfileira o provisionamento de E4-H2 por comando administrativo, sem evento. Fica como job direto; se outro consumidor precisar saber do registro, criar `dominio_registrado`.
9. **Fatura nova (E7-H4).** A história consome "o evento" de fatura nova, que não existe na base. Fica fora da tabela até a E7-H4 sair da pendência (notificações nativas do Asaas ou nossas).
10. **Consumidores fora das histórias.** O alerta à equipe da solicitação de cancelamento (E5-H10) e de tentativas esgotadas usa o canal do ADR 0011 e não conta como consumidor de negócio.

## Revisões

| Data | Revisão | Origem |
|---|---|---|
| 2026-09-25 | Criação do anexo. | CIT-47 |
| a definir | Revisão prevista pela #48 (PoC Skymail): payloads marcados "provisório (#48)" (`conta_ativada`, `dominio_verificado`, `conta_suspensa`, `conta_reativada`). | #48 |
