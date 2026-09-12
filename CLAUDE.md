# CITMail

Site estático (HTML/CSS/JS puro): `index.html` (landing), `login.html`, `checkout.html`, `painel.html`.
Identidade visual segue o Brandbook CIT (https://github.com/cittecnologia/brandbook-cit); tokens em `assets/tokens.css`.
Gestão de tarefas no Taiga, projeto CITMAIL.

## Fluxo de branches: Git Flow (padrão obrigatório)

Git Flow (AVH) já inicializado no repositório. Nunca commitar direto em `main` ou `develop`.

| Branch | Origem | Destino | Uso |
|---|---|---|---|
| `main` | — | — | Produção. Só recebe merge de `release/*` e `hotfix/*`, sempre com tag `vX.Y.Z`. |
| `develop` | `main` | — | Integração da próxima versão. |
| `feature/US<ref>-<slug>` | `develop` | `develop` | Uma história do Taiga. Ex.: `feature/US2-migracao-brandbook`. |
| `bugfix/<ref>-<slug>` | `develop` | `develop` | Correção de algo ainda não lançado (issue do Taiga). |
| `release/X.Y.Z` | `develop` | `main` + `develop` | Estabilização e QA da versão. |
| `hotfix/X.Y.Z` | `main` | `main` + `develop` | Correção urgente em produção. |

Comandos:

```sh
git flow feature start US<ref>-<slug>     # inicia história
git flow feature publish US<ref>-<slug>   # envia para o GitHub (abrir PR para develop)
git flow feature finish US<ref>-<slug>    # merge em develop
git flow release start X.Y.Z  /  git flow release finish X.Y.Z
git flow hotfix start X.Y.Z   /  git flow hotfix finish X.Y.Z
```

Regras:
- Antes de começar uma história do Taiga, criar a `feature/` a partir de `develop` atualizado.
- Mensagem de commit em português, citando a referência do Taiga: `US#2 tarefa #3: aplica tokens do brandbook`.
- Integração em `develop` e `main` preferencialmente via Pull Request no GitHub.
- Versionamento semântico nas tags de release/hotfix.
- Push, finish de release/hotfix e merge em `main` só com confirmação do responsável.
