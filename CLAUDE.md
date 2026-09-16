# CITMail

Site estático (HTML/CSS/JS puro): `index.html` (landing), `login.html`, `checkout.html`, `painel.html`. Publicado sem build pelo GitHub Pages a partir de `main` em `https://cittecnologia.github.io/citmail/` (subcaminho `/citmail/`: recursos locais sempre com caminho relativo).
Identidade visual segue o Brandbook CIT (https://github.com/cittecnologia/brandbook-cit); tokens em `assets/tokens.css`.
Gestão de tarefas no Taiga, projeto CITMAIL (slug `citmail`, id interno 1). Pontuação das histórias no papel **Front** (demais papéis com `?`).
Ícones: sprite `assets/icons.svg` (biblioteca do Brandbook CIT + complementos Lucide + marcas parceiras), usado via `<svg class="icon"><use href="assets/icons.svg#nome"></use></svg>`. Por causa do sprite externo, abrir as páginas por HTTP, não por `file://`.

## Ambiente

- Requisitos: Node ≥ 20.19. Setup: `npm ci` e `npx playwright install chromium`.
- Servidor de desenvolvimento: Vite, `npm run dev` → `http://127.0.0.1:4200/citmail/` (config em `vite.config.js`: mesmo subcaminho do Pages, arquivo inexistente responde 404). O Vite só serve os arquivos; não há build.
- Testes E2E: Playwright, `npm test` (sobe o Vite sozinho; perfis desktop e mobile). Specs em `tests/`, organizadas por página/funcionalidade (não por história); usar a fixture `erros` de `tests/fixtures.js` e marcar a história com tag (`{ tag: '@CIT-12' }`, filtrável com `npx playwright test --grep @CIT-12`).
- Nos testes, APIs de terceiros (ViaCEP etc.) são mockadas com `page.route`; usar só dados fictícios. Nunca anexar `test-results/` ou `playwright-report/` a PR ou Taiga.
- CI: `.github/workflows/testes.yml` roda `npm test` em todo PR para `develop` e `main` (e é reaproveitado pela homologação via `workflow_call`).
- Homologação: `.github/workflows/publicar-homologacao.yml`, a cada push na `develop`, roda os testes, envia só `*.html` e `assets/` por rsync para a VPS (`/var/www/novo.citmail.com.br`; apaga o resto, exceto `.well-known/`) e faz o smoke em `https://novo.citmail.com.br`. Execução manual ("Run workflow") só publica na `develop`; em outra branch roda só os testes. Para republicar, usar execução manual, não re-run de execução antiga (publicaria commit antigo). Produção continua no GitHub Pages.
- Environment `homologacao`: deployment branches só `develop` (é o que protege os secrets); secrets `SSH_HOST`, `USER_PASSWORD`, `SSH_KNOWN_HOSTS` (gerado com `ssh-keyscan -p <porta> <mesmo valor de SSH_HOST>`, impressão digital conferida na VPS); variables `SSH_PORT`, `SSH_USER`.
- Testes contra um site publicado (não sobe o Vite): PowerShell `$env:CITMAIL_BASE_URL='<url>'; npx playwright test tests/paginas.spec.js`; bash `CITMAIL_BASE_URL=<url> npx playwright test tests/paginas.spec.js`. Não copiar para PR ou Taiga logs com dados da VPS.

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
- **Prefixo das referências: `CIT`.** O mesmo `CIT-<nº>` forma o nome da branch e o início de toda mensagem de commit dela; commit e branch nunca divergem.
- `<nº>` é o campo `ref` do Taiga (o `#` exibido na interface), **não** o `id` interno retornado pela API.
- Sem história/issue no Taiga, não começar: pedir ao responsável que crie ou indique uma.
- Commits atômicos e temáticos, em português: `CIT-<nº>: <o que foi feito>` (ex.: branch `feature/CIT-12-migrar-login` → `CIT-12: migra formulário de login`); quando houver tarefa no Taiga, acrescentar `(tarefa #NN)` no final. Hotfix usa a referência da issue.
- Toda integração é via Pull Request no GitHub. **Não usar** `git flow feature/bugfix/release/hotfix finish` (fazem merge local).
- Release/hotfix: PR para `main` e PR de volta para `develop`; `npm test` verde e CHANGELOG atualizado antes do PR; após o merge em `main`, criar a tag `vX.Y.Z` (versionamento semântico) em `main`.
- Dependência entre histórias: PR com base na branch da história de que depende; após o merge dela, `git rebase develop` e redirecionar o PR para `develop`. Comentar a dependência nas duas histórias.
- Push, abertura de PR, **merge de qualquer PR**, criação de tag e exclusão de branch remota só com confirmação explícita do responsável. O agente nunca faz merge por conta própria.

## Fluxo de Product Owner

Skills globais (`~/.claude/skills/po-*`, regras comuns em `~/.claude/po/convencoes.md`). Todas mostram prévia e só escrevem no Taiga após aprovação.

| Skill | Uso |
|---|---|
| `/po-projeto` | Início de projeto: visão, épicos e histórias no backlog; página `visao-produto` na wiki. |
| `/po-epico` | Novo épico com histórias; destino: sprint atual, nova sprint ou backlog. |
| `/po-historia` | Nova história vinculada a épico; destino: sprint atual, nova sprint ou backlog. |
| `/po-sprint criar \| planejar \| encerrar` | Sprint `Sprint NNN` (001–999): abertura com datas e objetivo, seleção por capacidade, encerramento com pendências e resultado. |
| `/po-bug` | Bug como issue (passos, esperado/atual, severidade, evidências); correção segue `bugfix/*` ou `hotfix/*`. |

O PO cria até o nível de história; tasks nascem na etapa 2 do fluxo abaixo. Histórias saem com critérios de aceite e pontos iniciais, que a etapa 1 revisa.

## Fluxo de desenvolvimento de história

Executar com a skill **`/iniciar-historia <URL da história | #ref>`**, que conduz os passos abaixo, retoma de onde a história parou e aplica as regras deste arquivo. Sem a skill, seguir o resumo:

1. **Contexto**: `analyst` + `planner`; critérios de aceite (propor, se faltarem) e pontuação proposta.
2. **Plano**: `architect` + `critic`; tarefas no Taiga só para subtarefas reais. ⏸ Aprovação do responsável; aprovado → comentário "Plano aprovado" e pontuação gravada. Nada de branch antes disso.
3. **Implementação**: branch `feature/CIT-<nº>-<slug>`, commits `CIT-<nº>: ...`.
4. **Testes**: specs Playwright para cada critério (`npm test`, 3x estável; provar que falham com o defeito).
5. **Revisão**: `code-reviewer` + `security-reviewer` (+ `architect`/`critic` se ≥ 3 pontos, sem pontuação ou auth/pagamento/dados). Críticos e altos bloqueiam; máx. 2 ciclos de correção, depois reportar. Revisores não encerram processos que não iniciaram.
6. ⏸ Confirmação → push e PR para `develop` (`CIT-<nº>` no título). Merge só pelo responsável.

Status no Taiga:

| Momento | História | Tarefa | Issue (bugfix/hotfix) |
|---|---|---|---|
| Branch criada / tarefa iniciada | In progress | In progress | In progress |
| Testes verdes (vale durante a revisão) | Ready for test | — | Ready for test |
| PR aberto | In review | — | — |
| Tarefa concluída | — | Closed | — |
| Merge verificado (`gh pr view <n> --json state` = `MERGED`) | Done | — | Closed |

Bugfix e hotfix seguem os passos 3–6 (1–2 opcionais, a critério do responsável).
