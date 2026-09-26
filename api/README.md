# API do CITMail

API (Application Programming Interface: interface que outros programas usam para conversar com o sistema) em Node.js, com [Fastify](https://fastify.dev/) e PostgreSQL. Serve as rotas de back-end do CITMail; o site estático (`index.html`, `login.html`, `checkout.html`, `painel.html`) continua publicado à parte, sem build.

Pacote independente, sem workspace npm: `npm ci` aqui não mexe no `package.json`/`package-lock.json` da raiz, e o `npm ci`/`npm test` da raiz não instala nem roda nada desta pasta.

## Estrutura de pastas

```
api/
  compose.yaml        PostgreSQL local (desenvolvimento e teste) por Docker Compose
  .env.example        nomes das variáveis de ambiente (sem valores secretos)
  package.json        scripts e dependências da API
  migrations/         migrações SQL do node-pg-migrate (uma por arquivo, com Up/Down)
  src/
    config.js         lê e valida as variáveis de ambiente (carregarConfig)
    banco.js           pool do PostgreSQL (pg) e checagem de saúde (verificarBanco)
    app.js             fábrica construirApp(config, { pool, logStream }): Fastify, CORS, log e erros
    erros.js           tratamento padronizado de erro (400 por campo, 404, 500)
    servidor.js        ponto de entrada: carrega a config, sobe o Fastify, encerra em SIGTERM/SIGINT
    saude/rotas.js      GET /api/health
    exemplo/rotas.js    POST /api/exemplos (só fora de produção; fixa o padrão de schema e de erro)
  test/                suíte node:test (uma spec por critério de aceite)
```

Rotas de negócio futuras (pedidos, pagamentos, contas etc.) seguem a organização por módulo de domínio do [ADR 0002](../docs/adr/0002-organizacao-do-codigo-da-api.md): camadas rota → serviço → repositório dentro de cada módulo.

## Requisitos

- Node.js ≥ 20.19.
- Docker com Docker Compose (para o PostgreSQL local).

## Setup

Todos os comandos abaixo rodam dentro de `api/`.

```sh
cp .env.example .env
```

Preencha em `api/.env` (nunca versionado): `POSTGRES_PASSWORD` (senha do PostgreSQL de desenvolvimento) e `DATABASE_URL` com a mesma senha, por exemplo `postgres://postgres:<mesma-senha-de-POSTGRES_PASSWORD>@127.0.0.1:55432/citmail`. Os demais valores já vêm com um padrão de desenvolvimento no `.env.example`.

```sh
docker compose up -d --wait banco
npm ci
npm run migrar
npm run dev
```

Em outro terminal, conferir o health check (HTTP: protocolo do navegador; health check: rota que confirma se o serviço está no ar):

```sh
curl -i http://127.0.0.1:3000/api/health
```

Resposta esperada: status `200`, cabeçalho `x-request-id` e corpo `{"status":"ok","banco":"ok"}`.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe a API em desenvolvimento (`--env-file=.env`, `--watch`: reinicia ao salvar um arquivo). |
| `npm start` | Sobe a API lendo as variáveis já exportadas no processo (sem `--env-file`); uso em produção. |
| `npm run migrar` | Aplica as migrações pendentes (`node-pg-migrate up`). |
| `npm run migrar:reverter` | Reverte a última leva de migrações (`node-pg-migrate down`). |
| `npm run nova-migracao` | Cria um novo arquivo de migração SQL em `migrations/`. |
| `npm run banco:teste` | Sobe o PostgreSQL de teste (perfil `teste` do `compose.yaml`, dados em `tmpfs`, sem senha, só loopback). |
| `npm test` | Roda a suíte `node:test` sem acesso à rede externa (ver "Como rodar os testes"). |

## Variáveis de ambiente

Nomes usados por `src/config.js` e por `compose.yaml`; nenhum valor secreto vai neste documento nem no `.env.example`.

| Variável | Uso | Padrão |
|---|---|---|
| `DATABASE_URL` | String de conexão do PostgreSQL. | obrigatória, sem padrão |
| `POSTGRES_PASSWORD` | Senha do PostgreSQL de desenvolvimento; lida pelo `docker compose` a partir de `api/.env` e usada dentro de `DATABASE_URL`. | obrigatória, sem padrão |
| `HOST` | Endereço em que a API escuta. | `127.0.0.1` |
| `PORT` | Porta em que a API escuta. | `3000` |
| `CORS_ORIGENS` | Lista de origens permitidas, separadas por vírgula (CORS: Cross-Origin Resource Sharing, compartilhamento de recursos entre origens). Sem `*` e sem valor vazio. | obrigatória, sem padrão |
| `LOG_LEVEL` | Nível do log `pino` (`fatal`, `error`, `warn`, `info`, `debug`, `trace`). | `info` |
| `NODE_ENV` | Ambiente (`development`, `test`, `production`); em produção, `POST /api/exemplos` não é registrado. | `development` |

## Como rodar os testes

Suíte `node:test` (nativa do Node.js) em `api/test/`, uma spec por critério de aceite. Nunca usa Playwright (isso é do site, na raiz).

```sh
npm run banco:teste
npm test
```

`npm test` roda com `--import ./test/sem-rede.js`: uma guarda que bloqueia qualquer conexão a um host fora de `127.0.0.1`/`::1`/`localhost`. Nenhum teste depende de serviço externo; integrações futuras (Asaas, Skymail, RDAP) devem ser mockadas, nunca chamadas de verdade.

Sem Docker, um PostgreSQL 17 local serve no lugar do `banco:teste`: apontar `DATABASE_URL_TESTE` para ele (padrão: `postgres://postgres@127.0.0.1:55433/postgres`).

**Comando que a CI (Continuous Integration: verificação automática a cada mudança) da CIT-54 vai rodar:**

```sh
npm --prefix api ci && npm --prefix api run banco:teste && npm --prefix api test
```

## Definition of Done

Definition of Done (DoD: lista do que precisa ser verdade antes de considerar uma rota ou mudança pronta). Vale para toda rota e mudança desta API:

1. **Todo endpoint declara `schema`** (tipos, tamanhos e limites; corpo com `additionalProperties: false`). Como cumprir: seguir o padrão de `src/saude/rotas.js` e `src/exemplo/rotas.js` — toda rota nova define `schema.body`/`schema.response` com limites explícitos (`minLength`, `maxLength`, `minimum`, `maximum` etc.).
2. **O banco só é acessado por consulta parametrizada** (`$1`, `$2`; nunca concatenar valor em SQL). Como cumprir: usar sempre `pool.query(texto, valores)`, como em `src/banco.js`; nunca montar SQL com template string a partir de entrada do usuário.
3. **Os testes automatizados rodam sem internet** (guarda `sem-rede`, serviços externos mockados). Como cumprir: manter `--import ./test/sem-rede.js` no script `test` e mockar qualquer serviço externo novo em vez de chamá-lo de verdade.
4. **As ações críticas chamam a auditoria** (E6-H7; lista no [ADR 0013](../docs/adr/0013-seguranca-transversal-e-observabilidade.md), item 7). Como cumprir: ao implementar uma ação da lista (login, falha de login, bloqueio, criação/exclusão de caixa, troca de senha, alteração cadastral, cancelamento etc.), gravar na tabela de auditoria antes de responder — a auditoria em si ainda não existe nesta história (CIT-53), fica para a E6-H7.
5. **Nenhum segredo, senha ou dado pessoal em log** (`redact` do [ADR 0013](../docs/adr/0013-seguranca-transversal-e-observabilidade.md); segredos só por variável de ambiente). Como cumprir: adicionar todo campo sensível novo à lista `caminhosMascarados` de `src/app.js`, e nunca logar `config.databaseUrl` nem outra variável de ambiente sensível.

## Próximos passos

Fora do escopo desta história (CIT-53), documentados aqui como referência:

- Fila e eventos de domínio com Redis/BullMQ ([ADR 0005](../docs/adr/0005-fila-e-eventos-de-dominio.md)).
- Sessão do painel, com cookie ([ADR 0008](../docs/adr/0008-sessao-do-painel-e-senhas.md)).
- Auditoria efetiva das ações críticas (E6-H7).
- Webhooks (ex.: Asaas).
- Deploy da API na VPS, com `systemd`, Caddy e HTTPS (#57 e #93).

## ADRs relacionados

- [0002 — Organização do código da API](../docs/adr/0002-organizacao-do-codigo-da-api.md)
- [0003 — Framework HTTP](../docs/adr/0003-framework-http.md)
- [0004 — PostgreSQL, acesso ao banco e migrações](../docs/adr/0004-banco-e-migracoes.md)
- [0007 — Domínios, CORS e cookies por ambiente](../docs/adr/0007-dominios-cors-e-cookies-por-ambiente.md)
- [0013 — Segurança transversal e observabilidade](../docs/adr/0013-seguranca-transversal-e-observabilidade.md)
