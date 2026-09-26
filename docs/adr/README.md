# Registros de decisão de arquitetura (ADR)

ADR é a sigla de *architecture decision record*, registro de decisão de arquitetura: um documento curto que explica uma decisão técnica, as opções que foram avaliadas e por que a escolha final venceu. Este projeto segue o formato **MADR** (*Markdown Architectural Decision Records*), que define as seções obrigatórias usadas abaixo (ver ADR [0001](0001-registrar-decisoes-em-adr.md)).

Estes ADRs registram as decisões de arquitetura do back-end do CITMail, tomadas na história CIT-47, antes da implementação das histórias dos épicos E2 a E7 (Taiga #53 a #99, mais #90).

## Modelo de cada ADR

```
# NNNN. <Título>

Status: <proposto|aceito>
Data: 2026-09-25

## Contexto
## Opções consideradas
### Opção 1: <nome>
### Opção 2: <nome>
(### Opção 3 opcional)
## Decisão
## Justificativa
## Consequências
## Revisões
- 2026-09-25: criação (CIT-47).
```

## Status possíveis

| Status | Significado |
|---|---|
| `proposto` | Decisão registrada, mas ainda sujeita a confirmação ou revisão (ex.: aguardando aprovação do responsável, ou dependente da PoC #48). |
| `aceito` | Decisão confirmada pelo responsável, valendo para a implementação sem rediscussão. |
| `substituído por NNNN` | Decisão revogada; o ADR indicado por `NNNN` a substitui. O ADR antigo permanece no histórico, sem ser apagado. |

## Índice de ADRs

| Nº | Arquivo | Título | Status | Data |
|---|---|---|---|---|
| 0001 | [0001-registrar-decisoes-em-adr.md](0001-registrar-decisoes-em-adr.md) | Registrar decisões de arquitetura em ADRs (MADR) em `docs/adr` | aceito | 2026-09-25 |
| 0002 | [0002-organizacao-do-codigo-da-api.md](0002-organizacao-do-codigo-da-api.md) | Organização do código da API | proposto | 2026-09-25 |
| 0003 | [0003-framework-http.md](0003-framework-http.md) | Framework HTTP | proposto | 2026-09-25 |
| 0004 | [0004-banco-e-migracoes.md](0004-banco-e-migracoes.md) | PostgreSQL, acesso ao banco e migrações | proposto | 2026-09-25 |
| 0005 | [0005-fila-e-eventos-de-dominio.md](0005-fila-e-eventos-de-dominio.md) | Fila de jobs e eventos de domínio | proposto | 2026-09-25 |
| 0006 | [0006-execucao-na-vps-proxy-e-backup.md](0006-execucao-na-vps-proxy-e-backup.md) | Execução na VPS, proxy reverso com HTTPS e backup | proposto | 2026-09-25 |
| 0007 | [0007-dominios-cors-e-cookies-por-ambiente.md](0007-dominios-cors-e-cookies-por-ambiente.md) | Domínios, CORS e cookies por ambiente | proposto | 2026-09-25 |
| 0008 | [0008-sessao-do-painel-e-senhas.md](0008-sessao-do-painel-e-senhas.md) | Sessão do painel e armazenamento de senhas | proposto | 2026-09-25 |
| 0009 | [0009-consulta-de-dominio-e-tlds.md](0009-consulta-de-dominio-e-tlds.md) | Fonte da consulta de domínio e TLDs aceitos | proposto | 2026-09-25 |
| 0010 | [0010-email-transacional.md](0010-email-transacional.md) | Canal do e-mail transacional | aceito | 2026-09-25 |
| 0011 | [0011-alertas-da-equipe.md](0011-alertas-da-equipe.md) | Canal de alerta da equipe | aceito | 2026-09-25 |
| 0012 | [0012-fonte-unica-de-precos.md](0012-fonte-unica-de-precos.md) | Fonte única de preços com o servidor como autoridade | proposto | 2026-09-25 |
| 0013 | [0013-seguranca-transversal-e-observabilidade.md](0013-seguranca-transversal-e-observabilidade.md) | Segurança transversal e observabilidade | proposto | 2026-09-25 |

**Anexos** (referência, não decisão — sem `Status` nem seções de ADR):

| Arquivo | Conteúdo | Citado por |
|---|---|---|
| [anexos/modelo-de-dados.md](anexos/modelo-de-dados.md) | As 7 entidades do domínio, com chave, atributos, relações, estados e transições. | ADR 0004 |
| [anexos/eventos-de-dominio.md](anexos/eventos-de-dominio.md) | Tabela dos eventos de domínio da fila: nome, emissor, consumidor, payload e chave de idempotência. | ADR 0005 |

## Matriz: item do critério 1 → ADR

O critério de aceite 1 da história CIT-47 (E2-H1) lista os itens que a arquitetura precisa decidir. Cada um está coberto por um ADR (ou pelo anexo de modelo de dados):

| Item do critério 1 | ADR / anexo |
|---|---|
| Organização do código da API | [0002](0002-organizacao-do-codigo-da-api.md) |
| Framework HTTP | [0003](0003-framework-http.md) |
| Migrações | [0004](0004-banco-e-migracoes.md) |
| Biblioteca de fila | [0005](0005-fila-e-eventos-de-dominio.md) |
| Execução na VPS e proxy reverso com HTTPS | [0006](0006-execucao-na-vps-proxy-e-backup.md) |
| CORS entre a landing estática e a API | [0007](0007-dominios-cors-e-cookies-por-ambiente.md) |
| Sessão do painel | [0008](0008-sessao-do-painel-e-senhas.md) |
| Fonte da consulta de domínio e TLDs aceitos | [0009](0009-consulta-de-dominio-e-tlds.md) |
| Canal do e-mail transacional | [0010](0010-email-transacional.md) |
| Canal de alerta da equipe | [0011](0011-alertas-da-equipe.md) |
| Modelo de dados inicial | [anexos/modelo-de-dados.md](anexos/modelo-de-dados.md) (citado pelo ADR 0004) |

Dois critérios adicionais da história têm ADR próprio, fora da lista acima: fonte única de preços ([0012](0012-fonte-unica-de-precos.md), CA4) e segurança transversal e observabilidade ([0013](0013-seguranca-transversal-e-observabilidade.md), CA6).

## Decisões em aberto

Pendências que não foram fechadas dentro do timebox do spike (3 dias úteis, até 2026-10-01). Ao vencer o prazo, ficam registradas aqui em vez de estender a história.

| Decisão | Dono | Prazo |
|---|---|---|
| Subdomínio da API de homologação (ex.: `api.novo.citmail.com.br` ou `api-homolog.citmail.com.br`); afeta CORS, certificado e cookie (ADR 0007). | responsável | 2026-10-01 |
| Destino do backup fora da VPS (armazenamento de objetos, outro servidor da CIT ou outro); o ADR 0006 já decide o tipo, falta o provedor (E2-H7). | responsável | 2026-10-01 |
| Código da API neste repositório público em `api/` ou em repositório separado; a proposta do ADR 0002 é `api/` aqui. Confirmar, porque muda o CI (E2-H4) e o deploy (E2-H5 em diante). | responsável | 2026-10-01 |
| `assets/precos.js` gerado a partir da tabela do servidor ou continua manual com teste de paridade; a proposta do ADR 0012 é manual no MVP. Confirmar. | responsável | 2026-10-01 |
| Nome do evento de desativação da E3-H7 (proposta: `assinatura_cancelada`) e se o cancelamento feito pela equipe no fim do ciclo (E5-H10) também o publica. | responsável | 2026-10-01 |
| Origem que serve o painel depois da migração da landing (`citmail.com.br/painel` estático ou `painel.citmail.com.br`); afeta o cookie `SameSite` (ADR 0007 e 0008). A proposta aceita as duas, desde que fiquem sob `citmail.com.br`. | responsável | 2026-10-01 |

## Como propor ou revisar um ADR

1. Crie um arquivo `docs/adr/NNNN-<slug>.md`, com o próximo número disponível e o modelo de seções acima.
2. Descreva pelo menos duas opções em "Opções consideradas", sem benchmark: a justificativa se apoia em critérios documentados (requisitos, histórias, restrições), não em medição de desempenho.
3. Abra um Pull Request; a revisão de consistência segue o mesmo fluxo de qualquer mudança de código (`CLAUDE.md`, fluxo de desenvolvimento de história).
4. **Revisar uma decisão já aceita:**
   - Se a mudança é pequena e não invalida a decisão (ex.: um detalhe novo, uma exceção documentada), acrescente uma entrada em "Revisões" no próprio ADR, com a data e o motivo.
   - Se a mudança substitui a decisão (ex.: troca de tecnologia ou de opção escolhida), crie um ADR novo, que referencia o antigo, e mude o `Status` do ADR antigo para `substituído por NNNN` (o número do novo).
5. A PoC da Skymail (#48) pode confirmar ou invalidar decisões deste spike. Quando isso acontecer: revisão pontual vira entrada em "Revisões" do ADR afetado; revisão que muda a decisão vira ADR novo que substitui o antigo, como em qualquer outra revisão.

## Regra de placeholders para dados da VPS

Este repositório é público. Nenhum ADR, anexo ou este índice cita host, IP, porta, usuário de deploy ou credencial reais da VPS. Use sempre placeholders: `<host-da-vps>`, `<porta-ssh>`, `<usuario-de-deploy>`. Os únicos nomes de host permitidos em `docs/` são os públicos: `citmail.com.br` e subdomínios, `cittecnologia.github.io`, `registro.br` e `rdap.registro.br`, `github.com`, `letsencrypt.org`, `telegram.org`, e domínios de documentação de bibliotecas citadas. Valores reais (host, porta, usuário) ficam só nos secrets e variables do ambiente `homologacao`/`producao` do GitHub e em arquivo `chmod 600` no servidor, nunca neste repositório.
