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
- Testes E2E dos ajustes de textos e componentes da landing e do checkout (CIT-15).
- Testes E2E de layout, rolagem e tipografia do checkout (CIT-19).
- Checkout: aviso de desconto no passo de add-ons (CIT-21).
- Testes E2E dos preços, da sanfona e do aviso de desconto dos add-ons (CIT-21).

### Alterado
- Landing: novos textos do hero (título, subtítulo e indicadores), da faixa de confiança e da seção Recursos (CIT-15).
- Landing: busca de domínio com um único "@" como prefixo e sem a extensão .com (CIT-15).
- Toggle do plano anual fica verde quando ativo, na landing e no checkout (CIT-15).
- Mínimo de 2 contas passa a valer só para o plano de 5 GB (CIT-15).
- Marketplace com os novos serviços, sem preços e sem os cards de Servidores e DevOps (CIT-15).
- Checkout: barra de etapas com os rótulos abaixo dos círculos, sem sobrepor o resumo do pedido (CIT-19).
- Checkout: coluna única até 960px, com rolagem até a barra de etapas ao trocar de passo (CIT-19).
- Checkout: resumo do pedido com rolagem interna quando não cabe na janela e acessível por teclado (CIT-19).
- Checkout: fontes maiores nas etapas, nos cards e no resumo do pedido (CIT-19).
- Checkout: ajustes de transbordo no webmail, nos add-ons e no Skybox (CIT-19).
- Checkout: add-ons em seções recolhíveis (Armazenamento em nuvem, Talk, Backup e Domínio secundário), com subtotal no cabeçalho da seção fechada; Grupo de E-mail fica fora das seções (CIT-21).
- Checkout: botões − e + e campos de quantidade dos add-ons com nome acessível próprio (CIT-21).
- Checkout: preços dos add-ons numa tabela única, usada no passo 3, no subtotal e no resumo (CIT-21).
- Checkout: linhas de add-ons sem cursor de clique nem destaque ao passar o mouse (CIT-21).
- Checkout: título do passo de add-ons como `h2` (CIT-21).

### Removido
- `serve.py`, substituído pelo Vite.
- Prazo de ativação de 5 minutos dos textos da landing e do checkout (CIT-15).
- Opção de registro de domínio .com no checkout (CIT-15).

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
