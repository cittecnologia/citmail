# CITMail

Site estático (HTML/CSS/JS puro): `index.html` (landing), `login.html`, `checkout.html`, `painel.html`. Publicado sem build pelo GitHub Pages a partir de `main` em `https://cittecnologia.github.io/citmail/` (subcaminho `/citmail/`: recursos locais sempre com caminho relativo).
Identidade visual segue o Brandbook CIT (https://github.com/cittecnologia/brandbook-cit); tokens em `assets/tokens.css`.
Gestão de tarefas no Taiga, projeto CITMAIL (id interno 1).
Ícones: sprite `assets/icons.svg` (biblioteca do Brandbook CIT + complementos Lucide + marcas parceiras), usado via `<svg class="icon"><use href="assets/icons.svg#nome"></use></svg>`. Por causa do sprite externo, abrir as páginas por HTTP, não por `file://`.

## Ambiente

- Requisitos: Node ≥ 20.19. Setup: `npm ci` e `npx playwright install chromium`.
- Servidor de desenvolvimento: Vite, `npm run dev` → `http://127.0.0.1:4200/citmail/` (config em `vite.config.js`: mesmo subcaminho do Pages, arquivo inexistente responde 404). O Vite só serve os arquivos; não há build.
- Testes E2E: Playwright, `npm test` (sobe o Vite sozinho; perfis desktop e mobile). Specs em `tests/`, organizadas por página/funcionalidade (não por história); usar a fixture `erros` de `tests/fixtures.js` e marcar a história com tag (`{ tag: '@CIT-12' }`, filtrável com `npx playwright test --grep @CIT-12`).
- Nos testes, APIs de terceiros (ViaCEP etc.) são mockadas com `page.route`; usar só dados fictícios. Nunca anexar `test-results/` ou `playwright-report/` a PR ou Taiga.
- CI: `.github/workflows/testes.yml` roda `npm test` em todo PR para `develop` e `main`.

## Fluxo de branches: Git Flow (padrão obrigatório)

Git Flow (AVH) já inicializado no repositório. Nunca commitar direto em `main` ou `develop`.

| Branch | Origem | Destino | Uso |
|---|---|---|---|
| `main` | — | — | Produção (GitHub Pages). Só recebe PR de `release/*` e `hotfix/*`; tag `vX.Y.Z` após o merge. |
| `develop` | `main` | — | Integração da próxima versão. |
| `feature/CIT-<nº história>-<slug>` | `develop` (ou a branch da história de que depende) | `develop` | **Uma branch por história** do Taiga; tarefas viram commits. Ex.: `feature/CIT-12-migrar-login`. |
| `bugfix/CIT-<nº issue>-<slug>` | `develop` | `develop` | Correção de algo ainda não lançado (issue do Taiga). |
| `release/X.Y.Z` | `develop` | `main` + `develop` | Estabilização e QA da versão. |
| `hotfix/X.Y.Z` | `main` | `main` + `develop` | Correção urgente em produção. |

Comandos (PowerShell: rodar em linhas separadas):

```sh
git checkout <base>; git pull                        # sempre atualizar a branch base antes de criar a nova
git flow feature start CIT-<nº>-<slug> [base]        # história
git flow bugfix start CIT-<nº>-<slug>                # issue
git flow release start X.Y.Z                         # release (a partir de develop)
git flow hotfix start X.Y.Z                          # hotfix (a partir de main)
```

Regras:
- `<nº>` é o campo `ref` do Taiga (o `#` exibido na interface), **não** o `id` interno retornado pela API. O prefixo `CIT-` é convenção do projeto.
- Sem história/issue no Taiga, não começar: pedir ao responsável que crie ou indique uma.
- Commits atômicos e temáticos, em português: `CIT-12: <o que foi feito>`; quando houver tarefa no Taiga, `CIT-12: <o que foi feito> (tarefa #NN)`. Hotfix usa a referência da issue.
- Toda integração é via Pull Request no GitHub. **Não usar** `git flow feature/bugfix/release/hotfix finish` (fazem merge local).
- Release/hotfix: PR para `main` e PR de volta para `develop`; `npm test` verde e CHANGELOG atualizado antes do PR; após o merge em `main`, criar a tag `vX.Y.Z` (versionamento semântico) em `main`.
- Dependência entre histórias: PR com base na branch da história de que depende; após o merge dela, `git rebase develop` e redirecionar o PR para `develop`. Comentar a dependência nas duas histórias.
- Push, abertura de PR, **merge de qualquer PR**, criação de tag e exclusão de branch remota só com confirmação explícita do responsável. O agente nunca faz merge por conta própria.

## Fluxo de desenvolvimento de história

Status da história no Taiga (cada passo abaixo diz quando mudar):
New/Ready → **In progress** (passo 3) → **Ready for test** (passo 4 verde; permanece durante a revisão) → **In review** (PR aberto, aguardando merge humano) → **Done** (merge verificado).
Status das tarefas: In progress (ao iniciar) → Closed (ao concluir). Issues (bugfix/hotfix): In progress → Ready for test → Closed (após o merge).

1. **Contexto**: `analyst` + `planner` leem a história e os critérios de aceite (se não houver, propor). Propor pontuação com justificativa.
2. **Plano**: consenso `architect` + `critic`; criar tarefas no Taiga só se o plano gerar subtarefas reais. ⏸ Mostrar plano, critérios e pontuação e aguardar aprovação. Aprovado → registrar o plano como comentário na história e gravar a pontuação. Rejeitado → voltar ao passo 1 ou 2; nada de branch ou código antes da aprovação.
3. **Implementação**: atualizar a base, criar a branch, mover a história para **In progress**; commits atômicos; atualizar o status de cada tarefa.
4. **Testes**: `test-engineer` escreve/atualiza specs Playwright cobrindo cada critério de aceite e todas as validações (telas desktop e mobile; backend próprio via requisições reais, quando houver) e roda `npm test`. Falhas: corrigir e retestar, no máximo 2 ciclos; depois parar e reportar ao responsável. Verde → história em **Ready for test**.
5. **Revisão**: `code-reviewer` + `security-reviewer` (+ `architect`/`critic` se a história tiver ≥ 3 pontos, não tiver pontuação ou envolver auth/pagamento/dados). Críticos e altos bloqueiam (em auth/pagamento/dados, médios também); corrigir e retestar o afetado, no máximo 2 ciclos; depois parar e reportar ao responsável. Revisores não encerram processos globais (ex.: `taskkill /IM node.exe`); só os que eles mesmos iniciaram.
6. ⏸ Confirmar com o responsável → push, PR para `develop` com `CIT-<nº>` no título e critérios de aceite no corpo, link do PR comentado na história, história em **In review**. O merge é feito pelo responsável; depois de verificar (`gh pr view <n> --json state` = `MERGED`): apagar a branch local e mover a história para **Done**.

Bugfix e hotfix seguem os passos 3–6 (1–2 opcionais, a critério do responsável).
