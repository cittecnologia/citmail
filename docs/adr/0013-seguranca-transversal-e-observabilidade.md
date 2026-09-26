# 0013. Segurança transversal e observabilidade

Status: proposto
Data: 2026-09-25

## Contexto

O briefing exige senha com hash seguro, bloqueio temporário após falhas de login e auditoria das ações críticas (criação, exclusão, troca de senha). As histórias E6-H4 (bloqueio), E6-H7 (auditoria) e E2-H9 (logs) detalham esses pontos. O repositório é público.

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

1. **Segredos:** regras da CIT-46, acima.
2. **Senhas:** Argon2id com m=19 MiB, t=2, p=1 (ADR 0008).
3. **Força bruta (E6-H4):**
   - Contador de falhas por conta no Redis, com expiração de 15 min a partir da primeira falha. Chave pelo hash do e-mail normalizado, sem e-mail em claro.
   - Com 5 falhas, a 6ª tentativa é recusada até o contador expirar; a resposta informa o tempo de espera.
   - Contador por IP entre contas diferentes, com 429 acima do limite (valor na E6-H4).
   - Vale também para "esqueci a senha" (E5-H2) e para o 2FA (E5-H11). O bloqueio vai para a auditoria.
4. **Auditoria (E6-H7):** Opção 1.
   - Ações: login, falha de login, bloqueio, criação e exclusão de caixa, troca de senha, alteração cadastral, cancelamento, exclusão de dados, suspensão e reativação.
   - Campos: autor (cliente, sistema ou equipe), ação, alvo, data e hora, IP, resultado e `requestId`. Sem senha nem token.
   - O usuário de banco da aplicação não tem `UPDATE`, `DELETE` nem `TRUNCATE` na tabela.
5. **Logs (E2-H9):**
   - `pino` em JSON (logger do Fastify, ADR 0003) com `requestId`, rota, status e duração.
   - O `requestId` nasce na requisição, vai nos dados do job da fila e no registro do evento (ADR 0005), e o log do job repete o mesmo valor.
   - Mascarar senha, token, cookie, cabeçalho `Authorization` e CPF/CNPJ completo. Teste automatizado confere.
   - Retenção definida no plano da E2-H9.
6. **Redis:** escuta só na interface de loopback, com `protected-mode` ligado e autenticação por senha ou ACL. A senha fica em arquivo `chmod 600`. Sem porta aberta no firewall (ADR 0006).

```js
// Ilustrativo: máscara no logger
redact: { paths: ['req.headers.authorization', 'req.headers.cookie', '*.senha', '*.cpf', '*.cnpj'], censor: '[mascarado]' }
```

## Justificativa

- Tabela só de inclusão impede que um erro ou invasão na aplicação apague o rastro, e permite consulta por SQL no mvp.
- Contador no Redis tem expiração nativa e já é dependência decidida.
- O mesmo `requestId` da requisição ao job liga falhas de pagamento e de provisionamento a uma causa.
- Redis sem autenticação e exposto é vetor comum de invasão; aqui ele guarda sessão e fila.

## Consequências

- Duas permissões de banco distintas: a de migração (dona das tabelas) e a da aplicação (restrita na auditoria).
- A auditoria cresce sem apagar; retenção e arquivamento ficam para depois do mvp.
- Máscara de log por lista de campos exige manutenção quando surgir campo sensível novo.
- Bloqueio por conta permite que um atacante trave a conta de outra pessoa por 15 min. Aceito no mvp; CAPTCHA está fora do escopo da E6-H4.

## Revisões

- 2026-09-25: criação (CIT-47).
