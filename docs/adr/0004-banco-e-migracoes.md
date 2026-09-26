# 0004. PostgreSQL, acesso ao banco e migrações

Status: proposto
Data: 2026-09-25

## Contexto

Decidido pelo responsável em 2026-09-25: o banco é PostgreSQL, na mesma VPS da CIT que roda a API (ver ADR 0006). Falta decidir como a API acessa o banco e como as mudanças de schema são versionadas, para atender a Definition of Done da API (E2-H3): "o banco só é acessado por consulta parametrizada" e migrações que aplicam e revertem sem erro num banco vazio. O modelo de dados inicial (cliente, pedido, assinatura, conta do titular, caixa, evento, auditoria) está no anexo `anexos/modelo-de-dados.md`.

## Opções consideradas

### Opção 1: `node-pg-migrate` + `pg` com consulta parametrizada
Migrações SQL versionadas com `node-pg-migrate` (um arquivo por migração, com `up` e `down`); acesso ao banco pela biblioteca `pg`, sempre com consulta parametrizada (`$1`, `$2`, ...), sem *query builder* nem ORM.

### Opção 2: Knex
Knex como *query builder* e sistema de migrações no mesmo pacote.

### Opção 3: ORM (Drizzle ou Prisma)
Um ORM que gera o schema a partir de um modelo declarado em código e abstrai a consulta SQL.

## Decisão

- **Decidido pelo responsável em 2026-09-25:** PostgreSQL local na VPS.
- **Proposto:** migrações com `node-pg-migrate` e acesso por `pg` com consulta parametrizada.

## Justificativa

- **Consulta parametrizada explícita:** `pg` puro deixa a parametrização visível em cada chamada (`query('... WHERE id = $1', [id])`), o que facilita a revisão de segurança (SQL injection) exigida pela Definition of Done, sem a camada extra de abstração de um *query builder* ou ORM.
- **Migração simples e isolada:** `node-pg-migrate` escreve migrações em SQL puro ou JS fino, sem acoplar o schema a um modelo de ORM; cada migração é testável isoladamente (aplicar e reverter num banco vazio, critério de E2-H3).
- Knex resolveria migração e consulta no mesmo pacote, mas embute um *query builder* que a Definition of Done não pede; um ORM (Drizzle ou Prisma) exigiria mapear as sete entidades do modelo de dados num esquema próprio do ORM, o que adiciona uma camada de tradução sem necessidade clara neste porte de projeto.

Exemplo ilustrativo de migração (nomes do anexo de modelo de dados; ids UUID gerados pelo servidor):

```js
// migrations/1695600000000_criar-tabela-evento.js
exports.up = pgm => {
  pgm.createTable('evento', {
    id: { type: 'uuid', primaryKey: true },
    nome: { type: 'text', notNull: true },
    versao: { type: 'integer', notNull: true, default: 1 },
    agregado_tipo: { type: 'text', notNull: true }, // pedido, conta_titular ou assinatura
    agregado_id: { type: 'uuid', notNull: true },
    chave_idempotencia: { type: 'text', notNull: true, unique: true },
    payload: { type: 'jsonb', notNull: true },
    request_id: { type: 'text' },
    ocorrido_em: { type: 'timestamptz', notNull: true, default: pgm.func('now()') },
    publicado_em: { type: 'timestamptz' },
    tentativas_publicacao: { type: 'integer', notNull: true, default: 0 }
  })
}
exports.down = pgm => pgm.dropTable('evento')
```

A tabela `pedido` segue o mesmo padrão: `id` UUID, `cliente_id` UUID, coluna `estado` (não `status`) e `chave_idempotencia` única.

## Consequências

- Toda mudança de schema passa por uma migração nova em `api/migrations/`, aplicada em homologação antes do tráfego novo (ADR 0006/E2-H5) e revertível.
- Sem *query builder*, consultas mais complexas (junções entre pedido, assinatura e conta do titular) são escritas em SQL manual, o que exige atenção redobrada com a parametrização.
- PostgreSQL só em interface local na VPS (ver ADR 0006), sem acesso externo direto.

## Revisões

- 2026-09-25: criação (CIT-47).
- 2026-09-25: ajustes da revisão (CIT-47).
