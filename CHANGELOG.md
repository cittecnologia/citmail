# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Versionamento semântico.

## [Não lançado]

Ambiente de desenvolvimento e processo: história CIT-12 no Taiga.

### Adicionado
- Vite como servidor de desenvolvimento (`npm run dev`), no mesmo subcaminho `/citmail/` do GitHub Pages.
- Testes E2E com Playwright (`npm test`), em desktop e mobile: páginas sem erros, ícones do sprite existentes e recursos locais com caminho relativo.
- Workflow de CI que roda os testes em PRs para `develop` e `main`.
- Fluxo de desenvolvimento de história no `CLAUDE.md`.
- Publicação automática da `develop` na homologação (`https://novo.citmail.com.br`), com testes antes e smoke depois do deploy (CIT-13).
- Testes de páginas rodam contra um site publicado com `CITMAIL_BASE_URL` (CIT-13).

### Removido
- `serve.py`, substituído pelo Vite.

## [1.0.0] - 2026-09-13

Primeira versão publicada. Migra o site para o [Brandbook CIT v1.0](https://github.com/cittecnologia/brandbook-cit): história US#2 no Taiga, PR #2.

### Adicionado
- `assets/tokens.css` com os tokens do brandbook: cores, tipografia, espaçamento, raio, sombra e movimento.
- Logos oficiais do CITMail em `assets/brand/`, com favicon e apple-touch-icon.
- Sprite de ícones `assets/icons.svg`: biblioteca do brandbook, complementos Lucide e marcas parceiras.
- Download do boleto em PDF no checkout, pela página de impressão.
- Tecla ESC fecha modais e menus; `aria-label` em todos os botões só com ícone.

### Alterado
- Landing, login, checkout e painel com os componentes do brandbook:
  - base branca e navy nos blocos escuros;
  - botões 32/40/48 com raio 8;
  - badges e alertas com cores funcionais.
- Fonte Inter substituída por Montserrat (títulos e números) e Poppins (texto). Texto só em 16, 13 e 11 px, e títulos na escala responsiva.
- Textos revisados conforme Voz & Tom:
  - sem superlativos;
  - frases curtas com evidência;
  - slogan oficial literal.
- `serve.py` serve a pasta do próprio script, de qualquer diretório.

### Removido
- Font Awesome e emojis usados como ícone.
- Gradientes, sombras decorativas e cores fora da paleta.

### Corrigido
- Transbordo horizontal no mobile do checkout e do painel.
- Resumo do pedido fixo cobria o formulário no mobile.
- Vão no menu mobile da landing.
- "Configurar DNS" levava a Configurações.
- Card de propagação DNS espremido no mobile.
- Contrastes abaixo de WCAG AA.

### Pendente
- Meta description e card do marketplace dizem "a partir de R$ 19,90/mês", mas a tabela de planos começa em R$ 10,00 por conta. A definição de preço está com o PO.

[1.0.0]: https://github.com/cittecnologia/citmail/compare/e8b8810...v1.0.0
