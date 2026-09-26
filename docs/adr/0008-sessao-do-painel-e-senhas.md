# 0008. Sessão do painel e armazenamento de senhas

Status: proposto
Data: 2026-09-25

## Contexto

O titular entra no painel com e-mail e senha (E5-H1). Os critérios pedem sessão em cookie `HttpOnly`, `Secure` e `SameSite`, logout que invalida a sessão no servidor e senha guardada com Argon2 ou bcrypt. O briefing exige hash seguro, bloqueio após falhas de login e auditoria.

O briefing cita JWT (JSON Web Token) para autenticar o "usuário de painel na API". Esse JWT é da API da Skymail: a CIT o monta com a chave da Skymail para chamar a API dela, no servidor. Ele não autentica o titular no painel CITMail e nunca chega ao navegador.

Painel e API ficam no mesmo site (`*.citmail.com.br`), conforme o ADR 0007.

## Opções consideradas

### Opção 1: Cookie com id opaco e sessão no Redis
O cookie leva só um id aleatório. Os dados da sessão ficam no Redis, com expiração. Revogar é apagar a chave.

### Opção 2: JWT próprio em cookie
O cookie leva um token assinado com os dados da sessão. Não exige consulta a cada requisição, mas revogar antes do vencimento exige lista de bloqueio, que é uma sessão no servidor com outro nome.

### Opção 3: Sessão no PostgreSQL
Igual à Opção 1, com a sessão numa tabela. Não adiciona dependência, mas põe uma escrita no banco a cada requisição (renovação da inatividade) e exige limpeza de sessões vencidas.

Para o hash de senha, as opções são Argon2id e bcrypt, ambas aceitas pelo briefing.

## Decisão

Opção 1, com Argon2id.

Cookie:

- Nome `__Host-citmail_sessao`, `Path=/`, sem `Domain`, `HttpOnly`, `Secure`, `SameSite=Lax`.
- Valor: id opaco de 32 bytes aleatórios (`crypto.randomBytes`), em base64url.
- Novo id a cada login (evita fixação de sessão).

Sessão no Redis:

- Chave pelo hash SHA-256 do id, para que um dump do Redis não entregue sessões válidas.
- Dados: id do cliente, criação, último acesso, IP e agente de usuário do login.
- Expiração por inatividade (proposta: 30 min) e absoluta (proposta: 8 h). Valores finais na E5-H1.
- Revogação: logout apaga a sessão; troca ou redefinição de senha (E5-H2) apaga todas as sessões do cliente, por um conjunto de ids por cliente.

CSRF (falsificação de requisição entre sites):

- `SameSite=Lax` impede o envio do cookie em requisições vindas de outros sites, exceto navegação GET.
- Toda rota que altera estado (POST, PUT, PATCH, DELETE) exige `Origin` presente e igual a uma origem do painel do ambiente (ADR 0007). Sem `Origin`, 403.
- Rotas GET não alteram estado.

Senhas:

- Argon2id com os parâmetros mínimos recomendados pela OWASP (Password Storage Cheat Sheet): m=19 MiB (19456 KiB), t=2, p=1.
- Os parâmetros ficam no próprio hash. Se forem elevados, a senha é refeita no próximo login.
- Mensagem genérica para e-mail inexistente e senha errada (E5-H1). Bloqueio por tentativas no ADR 0013.

```js
// Ilustrativo (biblioteca argon2 do npm)
const hash = await argon2.hash(senha, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
```

## Justificativa

- Id opaco não carrega dado do cliente e é revogável na hora, o que atende ao logout da E5-H1 e à troca de senha da E5-H2.
- O Redis já está decidido para a fila, tem expiração nativa e aguenta a renovação a cada requisição sem pesar no PostgreSQL.
- `HttpOnly` tira o cookie do alcance do JavaScript da página.
- Argon2id resiste melhor a ataque com GPU que bcrypt, por exigir memória.

## Consequências

- Se o Redis cair, todos saem do painel. Aceito no mvp; o Redis precisa de persistência e proteção (ADRs 0006 e 0013).
- Cada requisição autenticada consulta o Redis.
- Argon2id com 19 MiB por hash limita logins simultâneos pela memória da VPS; considerar no teste de carga (E2-H12).
- Biblioteca nativa (`argon2`) exige compilação ou binário pré-compilado na VPS.
- O 2FA (E5-H11) entra como etapa extra antes de criar a sessão.

## Revisões

- 2026-09-25: criação (CIT-47).
