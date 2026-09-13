# CITMail

Site estático (HTML/CSS/JS puro): `index.html` (landing), `login.html`, `checkout.html`, `painel.html`.
Identidade visual segue o Brandbook CIT (https://github.com/cittecnologia/brandbook-cit); tokens em `assets/tokens.css`.
Gestão de tarefas no Taiga, projeto CITMAIL.
Ícones: sprite `assets/icons.svg` (biblioteca do Brandbook CIT + complementos Lucide + marcas parceiras), usado via `<svg class="icon"><use href="assets/icons.svg#nome"></use></svg>`. Por causa do sprite externo, abrir as páginas por HTTP, não por `file://`.
Servidor de desenvolvimento: Vite (`npm run dev` → `http://127.0.0.1:4200`, config em `vite.config.js`). O site continua sem build; o Vite só serve os arquivos.
Testes E2E: Playwright (`npm test`), specs em `tests/`. O `playwright.config.js` sobe o Vite sozinho (ou reaproveita o que já estiver rodando) e roda nos perfis desktop e mobile.

## Fluxo de branches: Git Flow (padrão obrigatório)

Git Flow (AVH) já inicializado no repositório. Nunca commitar direto em `main` ou `develop`.

| Branch | Origem | Destino | Uso |
|---|---|---|---|
| `main` | — | — | Produção. Só recebe merge de `release/*` e `hotfix/*`, sempre com tag `vX.Y.Z`. |
| `develop` | `main` | — | Integração da próxima versão. |
| `feature/CIT-<nº história>-<slug>` | `develop` (ou a branch da história anterior, se depender dela) | `develop` | **Uma branch por história** do Taiga; tarefas viram commits. Ex.: `feature/CIT-12-migrar-login`. |
| `bugfix/CIT-<nº issue>-<slug>` | `develop` | `develop` | Correção de algo ainda não lançado (issue do Taiga). |
| `release/X.Y.Z` | `develop` | `main` + `develop` | Estabilização e QA da versão. |
| `hotfix/X.Y.Z` | `main` | `main` + `develop` | Correção urgente em produção. |

Comandos:

```sh
git checkout develop && git pull                     # sempre atualizar antes de criar a branch
git flow feature start CIT-<nº>-<slug> [base]        # base = branch da história anterior, se houver dependência
git flow release start X.Y.Z  /  git flow release finish X.Y.Z
git flow hotfix start X.Y.Z   /  git flow hotfix finish X.Y.Z
```

Regras:
- `<nº>` é a referência `#` da história/issue no Taiga; o prefixo `CIT-` é convenção do projeto.
- Commits atômicos e temáticos, em português: `CIT-12: <o que foi feito>`.
- Integração em `develop` via Pull Request no GitHub; não usar `git flow feature finish` (o merge acontece no PR).
- Versionamento semântico nas tags de release/hotfix.
- Push, abertura de PR, finish de release/hotfix e merge em `main` só com confirmação do responsável.

## Fluxo de desenvolvimento de história

Status da história no Taiga: In progress (branch criada) → Ready for test (implementação pronta) → In review (PR aberto) → Done (merge confirmado pelo responsável).
Status das tarefas: In progress (ao iniciar) → Closed (ao concluir).

1. **Contexto**: `analyst` + `planner` leem a história e os critérios de aceite (se não houver, propor). Revisar a pontuação e registrar no Taiga se mudar.
2. **Plano**: consenso `architect` + `critic`; criar tarefas no Taiga só se o plano gerar subtarefas reais. ⏸ Mostrar plano e critérios e aguardar aprovação; registrar o plano aprovado como comentário na história.
3. **Implementação**: criar a branch (ver comandos acima), commits atômicos, atualizar o status de cada tarefa.
4. **Testes**: `test-engineer` escreve/atualiza specs Playwright em `tests/` cobrindo cada critério de aceite e todas as validações (telas desktop e mobile; endpoints via requisições reais, quando houver) e roda `npm test`. Falhas: corrigir e retestar, no máximo 2 ciclos; depois parar e reportar ao responsável.
5. **Revisão**: `code-reviewer` + `security-reviewer` (+ `architect`/`critic` se a história tiver ≥ 3 pontos, não tiver pontuação ou envolver auth/pagamento/dados). Críticos e altos bloqueiam; corrigir e retestar o afetado, no máximo 2 ciclos; depois parar e reportar ao responsável.
6. ⏸ Confirmar com o responsável → push, PR para `develop` com `CIT-<nº>` no título e critérios de aceite no corpo, link do PR comentado na história, história em In review. Após o merge confirmado: apagar a branch local e mover a história para Done.
