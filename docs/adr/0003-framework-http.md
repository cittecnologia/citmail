# 0003. Framework HTTP

Status: proposto
Data: 2026-09-25

## Contexto

A Definition of Done da API (E2-H3) exige schema de validação em todo endpoint, e a E2-H9 exige log estruturado em JSON com id de correlação em toda requisição. O framework HTTP escolhido precisa cobrir os dois pontos sem depender de bibliotecas soltas adicionadas caso a caso.

## Opções consideradas

### Opção 1: Fastify
Framework Node.js com validação de rota por JSON Schema nativa, logger `pino` embutido e um ecossistema de plugins oficiais (cookie, CORS, limite de taxa).

### Opção 2: Express com biblioteca de validação à parte
Express, o framework mais usado no Node.js, combinado com uma biblioteca de validação de schema separada (ex.: `zod` ou `ajv` via middleware).

### Opção 3: Hono
Framework HTTP leve, com foco em portabilidade entre runtimes (Node.js, edge).

## Decisão

Fastify.

## Justificativa

- **Schema por rota nativo:** a validação por JSON Schema em cada rota é um recurso de primeira classe do Fastify (`schema` na definição da rota), o que atende diretamente a Definition of Done da API sem exigir middleware externo nem disciplina manual em cada endpoint novo.
- **Log estruturado embutido:** o Fastify usa `pino` como logger padrão, já em JSON, o que atende a E2-H9 (log estruturado com id de correlação) com configuração mínima, em vez de integrar um logger por fora do framework.
- **Plugins prontos:** cookie (necessário para a sessão do painel, ADR 0008) e limite de taxa (necessário para a consulta de domínio, ADR 0009, e para o bloqueio de força bruta) já existem como plugins oficiais do Fastify.
- Express exigiria montar schema e logger por fora, com mais disciplina manual para não esquecer um endpoint; Hono tem ecossistema menor para os plugins de cookie e limite de taxa que este projeto precisa.

Exemplo ilustrativo de rota com schema:

```js
fastify.post('/api/orcamento', {
  schema: {
    body: {
      type: 'object',
      required: ['contas', 'ciclo'],
      properties: {
        contas: { type: 'object' },
        ciclo: { type: 'string', enum: ['mensal', 'anual'] }
      }
    }
  }
}, handler)
```

## Consequências

- Toda rota nova precisa declarar `schema`; a ausência de schema num endpoint de exemplo já é coberta por teste automatizado (E2-H3).
- O logger `pino` do Fastify precisa de configuração para mascarar campos sensíveis (senha, token, CPF/CNPJ completo, cabeçalho `Authorization`), conforme E2-H9.
- A equipe precisa aprender a API de plugins do Fastify (`fastify-plugin`), diferente do estilo de middleware do Express.

## Revisões

- 2026-09-25: criação (CIT-47).
