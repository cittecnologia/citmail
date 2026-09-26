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

PostgreSQL local na VPS (decidido). Migrações com `node-pg-migrate` e acesso por `pg` com consulta parametrizada (proposto).

## Justificativa

- **Consulta parametrizada explícita:** `pg` puro deixa a parametrização visível em cada chamada (`query('... WHERE id = $1', [id])`), o que facilita a revisão de segurança (SQL injection) exigida pela Definition of Done, sem a camada extra de abstração de um *query builder* ou ORM.
- **Migração simples e isolada:** `node-pg-migrate` escreve migrações em SQL puro ou JS fino, sem acoplar o schema a um modelo de ORM; cada migração é testável isoladamente (aplicar e reverter num banco vazio, critério de E2-H3).
- Knex resolveria migração e consulta no mesmo pacote, mas embute um *query builder* que a Definition of Done não pede; um ORM (Drizzle ou Prisma) exigiria mapear as sete entidades do modelo de dados num esquema próprio do ORM, o que adiciona uma camada de tradução sem necessidade clara neste porte de projeto.

Exemplo ilustrativo de migração:

```js
// migrations/1695600000000_criar-tabela-pedido.js
exports.up = pgm => {
  pgm.createTable('pedido', {
    id: 'id',
    cliente_id: { type: 'integer', notNull: true },
    status: { type: 'text', notNull: true },
    criado_em: { type: 'timestamptz', notNull: true, default: pgm.func('now()') }
  })
}
exports.down = pgm => pgm.dropTable('pedido')
```

## Consequências

- Toda mudança de schema passa por uma migração nova em `api/migrations/`, aplicada em homologação antes do tráfego novo (ADR 0006/E2-H5) e revertível.
- Sem *query builder*, consultas mais complexas (junções entre pedido, assinatura e conta do titular) são escritas em SQL manual, o que exige atenção redobrada com a parametrização.
- PostgreSQL só em interface local na VPS (ver ADR 0006), sem acesso externo direto.

## Revisões

- 2026-09-25: criação (CIT-47).
