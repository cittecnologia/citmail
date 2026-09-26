# 0001. Registrar decisões de arquitetura em ADRs (MADR) em `docs/adr`

Status: proposto
Data: 2026-09-25

## Contexto

O back-end do CITMail ainda não existe: histórias E2-H3 em diante (Taiga #53 a #99, mais #90) vão implementar API, banco, fila, deploy e integrações sobre decisões que hoje só estão no briefing e no plano de épicos. Sem um registro formal, cada história reabriria discussões já resolvidas ou tomaria decisões divergentes.

Decidido na análise da CIT-47: as decisões de arquitetura ficam em ADRs (registro de decisão de arquitetura, do inglês *architecture decision record*) no formato MADR (*Markdown Architectural Decision Records*), um arquivo por decisão em `docs/adr/NNNN-<slug>.md`, com índice em `docs/adr/README.md`.

## Opções consideradas

### Opção 1: ADRs em `docs/adr/` (MADR)
Um arquivo curto por decisão, versionado com o código, revisado por Pull Request como qualquer outra mudança.

### Opção 2: Wiki do Taiga
Registrar as decisões como páginas da wiki do projeto no Taiga.

### Opção 3: Documento único de arquitetura
Um único arquivo longo (ex.: `ARQUITETURA.md`) reunindo todas as decisões.

## Decisão

Proposto (decidido na análise da CIT-47, sem decisão formal do responsável): ADRs em `docs/adr/`, no formato MADR, um arquivo por decisão. Passa a `aceito` quando o responsável aprovar o PR desta história.

## Justificativa

- **Revisão por PR:** `docs/` é versionado no mesmo repositório do código; a wiki do Taiga não passa por revisão de PR e fica fora do histórico do Git.
- **Um assunto por arquivo:** um ADR por decisão é mais fácil de referenciar (por número), de revisar isoladamente e de substituir sem reescrever um documento inteiro — ao contrário de um documento único, que cresce sem fim e mistura decisões de maturidade diferente.
- **Rastreabilidade:** cada ADR tem `Status` e `Data`, e pode ser marcado como `substituído por NNNN`, o que preserva o histórico de por que uma decisão mudou (ex.: revisão pela PoC da Skymail, #48).

## Consequências

- Toda decisão de arquitetura relevante passa a exigir um ADR novo ou uma revisão de um existente, mesmo fora do escopo desta história.
- O índice (`docs/adr/README.md`) precisa ser mantido atualizado a cada ADR novo ou com mudança de status.
- Decisões de modelagem de dados e de eventos de domínio, por serem referência e não decisão, ficam em anexos (`docs/adr/anexos/`) e não em ADRs numerados.

## Revisões

- 2026-09-25: criação (CIT-47).
- 2026-09-25: ajustes da revisão (CIT-47).
