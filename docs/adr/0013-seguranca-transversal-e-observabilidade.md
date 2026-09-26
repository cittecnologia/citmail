# 0013. Segurança transversal e observabilidade

Status: proposto
Data: 2026-09-25

## Contexto

O briefing exige senha com hash seguro, bloqueio temporário após falhas de login e auditoria das ações críticas (criação, exclusão, troca de senha). As histórias E6-H4 (bloqueio), E6-H7 (auditoria), E2-H9 (logs) e E6-H3 (exclusão de dados, LGPD) detalham esses pontos. O repositório é público.

Decidido pelo responsável em 2026-09-25 (CIT-46, registrado no `CLAUDE.md`), sem rediscussão:

- Segredos só em environment do GitHub ou em arquivo de ambiente com `chmod 600` no servidor. Nunca no repositório nem em `.env` commitado (`.env`, `.env.*` e `.envrc` estão no `.gitignore`, exceto `.env.example`).
- Chave de terceiro sem consumidor (ex.: Skymail) fica no gerenciador de senhas do time até haver consumidor.
- Só o processo que usa o segredo lê o arquivo. Asaas, banco e SMTP seguem a mesma regra.

O resto deste ADR é proposta.

## Opções consideradas

As opções abaixo tratam da trilha de auditoria. Os demais itens seguem as histórias citadas.

### Opção 1: Auditoria em tabela própria, só de inclusão
Tabela `auditoria` no PostgreSQL. O usuário de banco da aplicação só tem permissão de inserir e ler.

### Opção 2: Auditoria só no log
Cada ação vira uma linha de log marcada. Mais simples, mas o log é rotacionado, é mais fácil de apagar e é difícil de consultar por cliente.

## Decisão

**Decidido pelo responsável em 2026-09-25:** item 1 (segredos, regras da CIT-46).

**Proposto:** itens 2 a 9.

1. **Segredos:** regras da CIT-46, acima.
2. **Senhas:** Argon2id com m=19 MiB, t=2, p=1, e login sem enumeração de contas (ADR 0008).
3. **IP do cliente:** o Fastify usa `trustProxy` restrito ao loopback (o Caddy, ADR 0006). Um `X-Forwarded-For` enviado pelo cliente não muda o IP usado no limite de taxa, no bloqueio e na auditoria.
4. **Força bruta (E6-H4):**
   - Contador de falhas por conta no Redis, com expiração de 15 min a partir da primeira falha. Chave por HMAC (segredo do servidor) do e-mail normalizado, sem e-mail em claro; HMAC e não hash simples, porque o espaço de e-mails é adivinhável (busca por dicionário reverteria um SHA-256 puro) e o segredo do HMAC impede reconstruir a chave sem ele. O contador existe também para e-mail inexistente, com a mesma resposta (sem enumeração).
   - Com 5 falhas, a 6ª tentativa de login é recusada até o contador expirar: **HTTP 429 com `Retry-After`** (segundos até liberar). Mesma resposta para conta existente e inexistente.
   - Contador por IP entre contas diferentes, também 429 com `Retry-After` acima do limite (valor na E6-H4).
   - "Esqueci a senha" (E5-H2) e o 2FA (E5-H11) têm limite próprio, por IP + conta. O bloqueio de login da conta **não** impede a recuperação de senha: um atacante que trava a conta não tira da vítima o caminho de volta.
   - O bloqueio vai para a auditoria.
5. **Cabeçalhos HTTP:**
   - API (`api.` de cada ambiente): `Strict-Transport-Security` (HSTS), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'`.
   - Painel: HSTS, CSP restrita (`default-src 'self'`, `connect-src` só com a origem da API, `frame-ancestors 'none'`, `base-uri 'none'`, `form-action 'self'`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`.
   - HSTS sem `includeSubDomains` até conferir que todos os subdomínios de `citmail.com.br` servem HTTPS. Conferido, acrescentar `includeSubDomains`.
   - Os cabeçalhos saem do Caddy. Enquanto o painel estiver num host que não permite cabeçalhos (GitHub Pages), a CSP vai em `<meta>`, e HSTS e `frame-ancestors` (que não funcionam em `<meta>`) ficam pendentes até o painel sair desse host (ADR 0007).
6. **Webhook do Asaas:** autenticação por `asaas-access-token` em tempo constante e conferência no Asaas antes de mudar estado (ADR 0005).
7. **Auditoria (E6-H7):** Opção 1.
   - Ações: login, falha de login, bloqueio, criação e exclusão de caixa, troca de senha, alteração cadastral, cancelamento, exclusão de dados, suspensão, reativação e registro manual de domínio pela equipe (E4-H4).
   - Campos: autor (cliente, sistema ou equipe), ação, alvo, data e hora, IP, resultado e `requestId`. Sem senha nem token.
   - O usuário de banco da aplicação não tem `UPDATE`, `DELETE` nem `TRUNCATE` na tabela.
8. **Logs (E2-H9):**
   - `pino` em JSON (logger do Fastify, ADR 0003) com `requestId`, rota, status e duração.
   - O `requestId` nasce na requisição, vai nos dados do job da fila e no registro do evento (ADR 0005), e o log do job repete o mesmo valor.
   - `redact` com caminhos explícitos em cada nível usado (o `redact` do pino aceita `*` para um nível, não curinga profundo): `senha`, `token`, `email`, `telefone`, `nome`, `cpf`, `cnpj`, `documento` na raiz, em `*.` e em `*.*.`; mais `req.headers.cookie`, `req.headers.authorization`, `req.headers["asaas-access-token"]` e `res.headers["set-cookie"]`. Esses quatro últimos caminhos só existem no log se o serializer de requisição e resposta do Fastify for customizado para incluir `headers` (o serializer padrão não os expõe); o teste automatizado de mascaramento roda sobre o serializer real configurado, não sobre um objeto de log fabricado à parte.
   - A query string não leva segredo: o token de senha vai no fragmento da URL (ADR 0008).
   - Retenção definida no plano da E2-H9.
9. **Retenção e LGPD** (prazos propostos, a confirmar pelo responsável):
   - Auditoria: IP guardado em claro por 6 meses (guarda de registros de acesso do Marco Civil da Internet, art. 15); depois pseudonimizado (HMAC com chave fora do banco) ou apagado. O registro em si fica 5 anos.
   - Sessão: no máximo 8 h no Redis (ADR 0008); IP e agente de usuário somem com ela.
   - Evento bruto do Asaas: 90 dias (ADR 0005).
   - Exclusão de dados (E6-H3): a anonimização do cliente não apaga a auditoria. A auditoria só tem ids, IP (pseudonimizado após o prazo) e `detalhes` sem dado pessoal; referencia o alvo sem chave estrangeira, e o registro sobrevive à anonimização.

**Redis:** escuta só na interface de loopback, com `protected-mode` ligado e autenticação por senha ou ACL. A senha fica em arquivo `chmod 600`. Sem porta aberta no firewall. Persistência e política de memória no ADR 0006.

```js
// Ilustrativo: máscara no logger (lista completa no item 8)
const sensiveis = ['senha', 'token', 'email', 'telefone', 'nome', 'cpf', 'cnpj', 'documento']
redact: {
  paths: [
    ...sensiveis, ...sensiveis.map(c => `*.${c}`), ...sensiveis.map(c => `*.*.${c}`),
    'req.headers.cookie', 'req.headers.authorization',
    'req.headers["asaas-access-token"]', 'res.headers["set-cookie"]'
  ],
  censor: '[mascarado]'
}
```

## Justificativa

- Tabela só de inclusão impede que um erro ou invasão na aplicação apague o rastro, e permite consulta por SQL no mvp.
- Contador no Redis tem expiração nativa e já é dependência decidida.
- `trustProxy` restrito evita que o atacante escolha o próprio IP e escape do limite de taxa.
- Resposta igual e tempo igual para conta existente e inexistente não revelam quem é cliente.
- Recuperação de senha fora do bloqueio de login reduz o dano do bloqueio forçado por terceiros.
- Cabeçalhos de segurança fecham clickjacking (`frame-ancestors`), rebaixamento para HTTP (HSTS) e interpretação errada de tipo (`nosniff`).
- O mesmo `requestId` da requisição ao job liga falhas de pagamento e de provisionamento a uma causa.
- Redis sem autenticação e exposto é vetor comum de invasão; aqui ele guarda sessão e fila.
- Prazos de retenção limitam o dado pessoal guardado ao necessário (LGPD), sem perder o rastro exigido.

## Consequências

- Duas permissões de banco distintas: a de migração (dona das tabelas) e a da aplicação (restrita na auditoria).
- Pseudonimizar o IP da auditoria exige uma rotina com permissão própria de `UPDATE` só na coluna `ip`, separada do usuário da aplicação.
- Máscara de log por lista de caminhos exige manutenção quando surgir campo sensível novo ou nível mais fundo.
- Bloqueio por conta ainda permite que um atacante trave o login de outra pessoa por 15 min; a recuperação de senha continua livre. Aceito no mvp; CAPTCHA está fora do escopo da E6-H4.
- Enquanto o painel estiver no GitHub Pages, parte dos cabeçalhos do painel não se aplica.
- Os prazos de retenção entram em "Decisões em aberto" do README até o responsável confirmar.

## Revisões

- 2026-09-25: criação (CIT-47).
- 2026-09-25: ajustes da revisão (CIT-47).
