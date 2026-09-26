# 0002. Organização do código da API

Status: proposto
Data: 2026-09-25

## Contexto

A API (E2-H3) precisa de um lugar para viver e de uma organização interna clara antes de a primeira rota ser escrita. O deploy do site estático hoje só envia `*.html` e `assets/` (`.github/workflows/publicar-homologacao.yml`), então a API pode conviver no mesmo repositório sem afetar esse fluxo. O repositório é público (CIT-46): qualquer código novo aqui entra sob a regra de segredos fora do repositório e do scan de segredos no CI (E2-H4).

## Opções consideradas

### Opção 1: Pasta `api/` neste repositório, por módulo de domínio
`api/` na raiz, com um módulo por domínio de negócio (`pedidos`, `pagamentos`, `contas`, `caixas`, `eventos`, `auditoria`), e dentro de cada módulo as camadas rota → serviço → repositório.

### Opção 2: Repositório separado para a API
Um repositório novo, privado ou público, só para o back-end.

### Opção 3: Organização por camada técnica
Uma pasta por camada técnica (`routes/`, `services/`, `repositories/`) na raiz de `api/`, todos os domínios misturados dentro de cada camada.

## Decisão

Pasta `api/` neste repositório, organizada por módulo de domínio, com as camadas rota → serviço → repositório dentro de cada módulo.

## Justificativa

- **Um repositório só:** evita duplicar CI, revisão e histórico entre dois repositórios para um produto do mesmo tamanho; o deploy do site já ignora tudo que não seja `*.html` e `assets/`, então a coexistência é segura.
- **Módulo de domínio, não camada técnica:** um pedido de mudança numa história (ex.: E4-H2, provisionamento) quase sempre mexe em rota, serviço e repositório do mesmo domínio ao mesmo tempo; separar por módulo mantém esses arquivos próximos, enquanto separar por camada técnica espalharia a mudança em três pastas distintas.
- **Alinhado ao modelo de dados:** os módulos (`pedidos`, `pagamentos`, `contas`, `caixas`, `eventos`, `auditoria`) espelham as entidades do anexo de modelo de dados, o que facilita achar onde uma entidade é tratada.

Exemplo de estrutura:

```
api/
  src/
    pedidos/
      rotas.js
      servico.js
      repositorio.js
    pagamentos/
    contas/
    caixas/
    eventos/
    auditoria/
  migrations/
  README.md
```

## Consequências

- Repositório público: todo código novo em `api/` passa pelo scan de segredos do CI (E2-H4); nenhum segredo (chave, senha, token) pode ser commitado, mesmo em teste ou script de exemplo.
- O README da API (E2-H3) documenta a Definition of Done (schema por endpoint, só consulta parametrizada, testes sem internet, auditoria nas ações críticas, nenhum segredo em log) dentro de `api/README.md`.
- Mover a API para um repositório separado depois exige recortar `api/` com seu histórico de Git; a decisão pode ser revisada se o crescimento do time ou do código justificar.

## Revisões

- 2026-09-25: criação (CIT-47).
