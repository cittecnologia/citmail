// @ts-check
import { test, expect } from './fixtures.js';
// CIT-22: guarda de carga (assets/precos.js não carrega) — espera erro de propósito, por isso usa o
// `test` puro do Playwright em vez da fixture `erros` (que falharia com qualquer erro registrado).
import { test as testSemErros } from '@playwright/test';

// CIT-15: ajuste de textos e componentes da landing (index.html).
// Cada teste roda nos dois perfis configurados em playwright.config.js (desktop e mobile).

/**
 * Cor calculada de var(--cit-success) na página, lida de um elemento sonda,
 * para os testes não fixarem o valor do token.
 * @param {import('@playwright/test').Page} page
 */
async function corSucesso(page) {
  return page.evaluate(() => {
    const sonda = document.createElement('div');
    sonda.style.backgroundColor = 'var(--cit-success)';
    document.body.appendChild(sonda);
    const cor = getComputedStyle(sonda).backgroundColor;
    sonda.remove();
    return cor;
  });
}

test.describe('landing — hero', { tag: '@CIT-15' }, () => {
  test('h1 exibe o texto final com destaque em "e-mail profissional"', async ({ page, erros }) => {
    await page.goto('index.html');
    const h1 = page.locator('.hero-title');
    await expect(h1).toHaveText('Eleve o nível da sua marca com um e-mail profissional personalizado');
    await expect(h1.locator('.highlight')).toHaveText('e-mail profissional');
  });

  test('h1 não estoura a largura do documento', async ({ page, erros }) => {
    await page.goto('index.html');
    await expect(page.locator('.hero-title')).toBeVisible();
    const [scrollWidth, clientWidth] = await page.evaluate(() => [
      document.documentElement.scrollWidth,
      document.documentElement.clientWidth,
    ]);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
  });

  for (const largura of [320, 360]) {
    test(`h1 cabe na largura útil em telas de ${largura}px sem quebrar "e-mail" no hífen`, async ({ page, erros }) => {
      await page.setViewportSize({ width: largura, height: 800 });
      await page.goto('index.html');
      await expect(page.locator('.hero-title')).toBeVisible();
      // a coluna do hero é alargada pelo mockup ao lado (fora do escopo), então o h1 é medido
      // restrito à largura útil do container: nenhum trecho do título pode passar dela
      const medida = await page.evaluate(() => {
        const h1 = /** @type {HTMLElement} */ (document.querySelector('.hero-title'));
        const container = /** @type {HTMLElement} */ (h1.closest('.container'));
        const estilo = getComputedStyle(container);
        const util = document.documentElement.clientWidth - parseFloat(estilo.paddingLeft) - parseFloat(estilo.paddingRight);
        h1.style.width = `${util}px`;
        const palavra = /** @type {HTMLElement} */ (h1.querySelector('.highlight .nowrap-word'));
        return { util, scrollWidth: h1.scrollWidth, linhasEmail: palavra.getClientRects().length, textoEmail: palavra.textContent };
      });
      expect(medida.scrollWidth).toBeLessThanOrEqual(medida.util);
      expect(medida.textoEmail).toBe('e-mail');
      expect(medida.linhasEmail).toBe(1);
    });
  }

  test('subtítulo do hero exibe o texto final', async ({ page, erros }) => {
    await page.goto('index.html');
    await expect(page.locator('.hero-subtitle')).toHaveText(
      'Os e-mails da sua empresa com domínio próprio (exemplo: suaempresa.com.br) com segurança e praticidade. Gerencie suas contas diretamente no painel, sem complicações.'
    );
  });

  test('1º indicador do hero mostra o ícone headset e o rótulo de suporte', async ({ page, erros }) => {
    await page.goto('index.html');
    const primeiro = page.locator('.hero-stat').nth(0);
    // o Vite reescreve "assets/..." para "/citmail/assets/..." ao servir, por isso o teste checa só o sufixo
    await expect(primeiro.locator('.number use')).toHaveAttribute('href', /icons\.svg#headset$/);
    await expect(primeiro.locator('.number svg')).toHaveAttribute('aria-hidden', 'true');
    await expect(primeiro.locator('.label')).toHaveText('Suporte técnico humanizado');
  });

  test('2º indicador do hero mostra disponibilidade e o 3º indicador permanece inalterado', async ({ page, erros }) => {
    await page.goto('index.html');
    const stats = page.locator('.hero-stat');
    await expect(stats.nth(1).locator('.number')).toHaveText('99,5%');
    await expect(stats.nth(1).locator('.label')).toHaveText('Disponibilidade garantida');
    // guarda de regressão: o 3º indicador não fazia parte do escopo do ajuste
    await expect(stats.nth(2).locator('.number')).toHaveText('500+');
    await expect(stats.nth(2).locator('.label')).toHaveText('Clientes ativos');
  });

  test('selo flutuante "Ativo em 5 min" foi removido do hero', async ({ page, erros }) => {
    await page.goto('index.html');
    await expect(page.locator('.hero-float-2')).toHaveCount(0);
    // guarda de regressão: o outro selo flutuante continua no lugar
    await expect(page.locator('.hero-float-1')).toHaveCount(1);
  });
});

test.describe('landing — faixa de confiança', { tag: '@CIT-15' }, () => {
  test('faixa de confiança tem 4 itens e não cita pagamento recorrente nem meios de pagamento', async ({ page, erros }) => {
    await page.goto('index.html');
    const itens = page.locator('.trust-bar-inner .trust-item');
    await expect(itens).toHaveCount(4);
    const texto = await itens.allInnerTexts();
    expect(texto.join(' ')).not.toContain('Pagamento recorrente automático');
    expect(texto.join(' ')).not.toContain('Pix, boleto e cartão');
  });
});

test.describe('landing — recursos e domínio', { tag: '@CIT-15' }, () => {
  test('subtítulo da seção Recursos exibe o texto final', async ({ page, erros }) => {
    await page.goto('index.html');
    await expect(page.locator('#features .section-header p')).toHaveText(
      'Domínio, Webmail, Apps, Add-ons e Antispam em um único painel de gestão.'
    );
  });

  test('prefixo do campo de domínio mostra só "@", sem ícone', async ({ page, erros }) => {
    await page.goto('index.html');
    const prefixo = page.locator('.domain-prefix');
    // toHaveText (não toBeVisible): o prefixo fica oculto por CSS em telas ≤600px
    await expect(prefixo).toHaveText('@');
    await expect(prefixo.locator('svg')).toHaveCount(0);
  });

  test('chip .com foi removido e o .com.br continua ativo', async ({ page, erros }) => {
    await page.goto('index.html');
    await expect(page.locator('.tld-chip[data-tld=".com"]')).toHaveCount(0);
    // guarda de regressão: os demais chips continuam presentes e o .com.br segue selecionado
    await expect(page.locator('.tld-chip[data-tld=".com.br"]')).toHaveClass(/active/);
    await expect(page.locator('.tld-chip[data-tld=".net.br"]')).toHaveCount(1);
    await expect(page.locator('.tld-chip[data-tld=".org.br"]')).toHaveCount(1);
    await expect(page.locator('.tld-chip[data-tld=".adv.br"]')).toHaveCount(1);
    await expect(page.locator('.tld-chip[data-tld=".med.br"]')).toHaveCount(1);
  });
});

test.describe('landing — plano anual', { tag: '@CIT-15' }, () => {
  test('toggle mensal/anual fica verde só no anual e volta à cor inicial no mensal', async ({ page, erros }) => {
    await page.goto('index.html');
    const verde = await corSucesso(page);
    const toggle = page.locator('#billingToggle');
    await toggle.scrollIntoViewIfNeeded();
    // lê o valor inicial em vez de fixar a cor azul, para não acoplar o teste a um token específico
    const corInicial = await toggle.evaluate(el => getComputedStyle(el).backgroundColor);
    expect(corInicial).not.toBe(verde);

    await toggle.click();
    await expect(toggle).toHaveCSS('background-color', verde);

    await toggle.click();
    await expect(toggle).toHaveCSS('background-color', corInicial);
  });
});

test.describe('landing — quantidade de contas', { tag: '@CIT-15' }, () => {
  test('plano de 5 GB: botões e digitação respeitam o mínimo de 2 contas', async ({ page, erros }) => {
    await page.goto('index.html');
    const card = page.locator('#card5');
    const input = page.locator('#qty5');
    const aumentar = card.getByRole('button', { name: 'Aumentar' });
    const diminuir = card.getByRole('button', { name: 'Diminuir' });

    await aumentar.click();
    await expect(input).toHaveValue('2');

    // abaixo do mínimo zera em um único clique
    await diminuir.click();
    await expect(input).toHaveValue('0');

    await input.fill('1');
    await input.press('Tab');
    await expect(input).toHaveValue('2');

    await input.fill('-3');
    await input.press('Tab');
    await expect(input).toHaveValue('0');
  });

  test('plano de 5 GB: diminuir de 3 contas vai para 2', async ({ page, erros }) => {
    await page.goto('index.html');
    const input = page.locator('#qty5');
    await input.fill('3');
    await input.press('Tab');
    await expect(input).toHaveValue('3');

    await page.locator('#card5').getByRole('button', { name: 'Diminuir' }).click();
    await expect(input).toHaveValue('2');
  });

  test('planos de 25 GB e 50 GB aceitam quantidade mínima de 1 conta', async ({ page, erros }) => {
    await page.goto('index.html');
    const qty25 = page.locator('#qty25');
    const qty50 = page.locator('#qty50');

    await page.locator('#card25').getByRole('button', { name: 'Aumentar' }).click();
    await expect(qty25).toHaveValue('1');

    await page.locator('#card25').getByRole('button', { name: 'Diminuir' }).click();
    await expect(qty25).toHaveValue('0');

    await qty50.fill('1');
    await qty50.press('Tab');
    await expect(qty50).toHaveValue('1');
  });

  test('href do CTA de contratação reflete a quantidade escolhida (qty25=1)', async ({ page, erros }) => {
    await page.goto('index.html');
    const qty25 = page.locator('#qty25');
    await qty25.fill('1');
    await qty25.press('Tab');
    await expect(page.locator('#calcCtaBtn')).toHaveAttribute('href', /qty25=1/);
  });

  test('textos de mínimo de contas: só o card de 5 GB cita "Mínimo 2 contas"', async ({ page, erros }) => {
    await page.goto('index.html');
    await expect(page.locator('#card5 .atc-storage')).toContainText('Mínimo 2 contas');
    await expect(page.locator('#card25 .atc-storage')).not.toContainText('Mínimo 2 contas');
    await expect(page.locator('#card50 .atc-storage')).not.toContainText('Mínimo 2 contas');
    await expect(page.locator('.discount-info strong').first()).toHaveText('Mínimo de 2 contas no plano de 5 GB.');
  });
});

test.describe('landing — marketplace', { tag: '@CIT-15' }, () => {
  test('marketplace exibe os 6 serviços na ordem, com selos e ícones corretos', async ({ page, erros }) => {
    await page.goto('index.html');
    const cards = page.locator('#marketplace .marketplace-card');
    await expect(cards).toHaveCount(6);

    const esperado = [
      { titulo: 'E-mail Corporativo', badge: 'Incluído', icone: 'mail' },
      { titulo: 'Backup adicional', badge: 'Disponível', icone: 'history' },
      { titulo: 'Armazenamento em nuvem', badge: 'Disponível', icone: 'cloud' },
      { titulo: 'Talk', badge: 'Disponível', icone: 'video' },
      { titulo: 'E-mail Registrado', badge: 'Sob consulta', icone: 'mail-check' },
      { titulo: 'Microsoft 365', badge: 'Sob consulta', icone: 'laptop' },
    ];

    for (let i = 0; i < esperado.length; i++) {
      const card = cards.nth(i);
      await expect(card.locator('h3')).toHaveText(esperado[i].titulo);
      await expect(card.locator('.badge')).toHaveText(esperado[i].badge);
      await expect(card.locator('.marketplace-icon use')).toHaveAttribute(
        'href', new RegExp(`icons\\.svg#${esperado[i].icone}$`)
      );
    }
  });

  test('marketplace exibe as descrições finais dos serviços', async ({ page, erros }) => {
    await page.goto('index.html');
    const cards = page.locator('#marketplace .marketplace-card');
    const descricoes = [
      'Caixas de e-mail com domínio próprio, webmail, IMAP/POP3/SMTP e proteção antispam.',
      'Backup automático das contas de e-mail por períodos maiores.',
      'Integrado ao e-mail, com sincronização de arquivos via computador e acesso web.',
      'Videoconferência ilimitada, com armazenamento das gravações em nuvem.',
      'Para comunicações que exigem formalidade e comprovação, o E-mail Registrado substitui processos burocráticos com eficiência e validade jurídica. Ideal para empresas que valorizam rastreabilidade, proteção e conformidade.',
      'E-mail, OneDrive, aplicativos online e offline. Planos que se encaixam desde pequenas a grandes empresas, que desejam escalar com aplicativos de produtividade da Microsoft.',
    ];
    for (let i = 0; i < descricoes.length; i++) {
      await expect(cards.nth(i).locator('p')).toHaveText(descricoes[i]);
    }
  });

  test('marketplace não exibe preços nem os cards antigos de Servidores/DevOps', async ({ page, erros }) => {
    await page.goto('index.html');
    const marketplace = page.locator('#marketplace');
    await expect(marketplace.locator('.from')).toHaveCount(0);
    await expect(marketplace.locator('.price')).toHaveCount(0);
    await expect(marketplace).not.toContainText('Servidores Cloud');
    await expect(marketplace).not.toContainText('DevOps');
    await expect(marketplace).not.toContainText('Backup, servidores e consultoria de TI');
  });

  test('grade do marketplace usa 3 colunas no desktop e 1 no mobile', async ({ page, erros }, testInfo) => {
    await page.goto('index.html');
    const grid = page.locator('#marketplace .marketplace-grid');
    const colunas = await grid.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    const esperado = testInfo.project.name === 'mobile' ? 1 : 3;
    expect(colunas).toBe(esperado);
  });

  test('grade do marketplace usa 2 colunas em telas intermediárias (800px)', async ({ page, erros }) => {
    await page.setViewportSize({ width: 800, height: 900 });
    await page.goto('index.html');
    const grid = page.locator('#marketplace .marketplace-grid');
    const colunas = await grid.evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length);
    expect(colunas).toBe(2);
  });
});

test.describe('landing — textos, FAQ e meta', { tag: '@CIT-15' }, () => {
  test('nenhuma referência a prazo de "5 min" resta no HTML da landing', async ({ page, erros }) => {
    await page.goto('index.html');
    const html = await page.content();
    expect(html).not.toMatch(/\b5(?:\s|&nbsp;)*min/i);
  });

  test('FAQ de DNS exibe o texto final', async ({ page, erros }) => {
    await page.goto('index.html');
    const resposta = page.locator('.faq-answer p').filter({ hasText: 'propagação de DNS' });
    await expect(resposta).toHaveText(
      'Após a confirmação do pagamento, criamos as contas e enviamos as credenciais de acesso por e-mail. ' +
      'A propagação de DNS leva até 48h e costuma terminar em menos de 6 horas. A partir desse período as contas estão aptas a enviar e receber e-mails.'
    );
  });

  test('<title> da landing permanece inalterado', async ({ page, erros }) => {
    await page.goto('index.html');
    await expect(page).toHaveTitle('CITMail — E-mail corporativo com domínio próprio');
  });
});

// CIT-22, Passo 5: preço de tabela riscado, regra do checkout (anual sem volume) e recálculo na carga.
// Termos do plano: "atual" = preço de lista de hoje; "tabela" = atual / 0,85, arredondado ao centavo;
// "cobrado" = o que entra no total; "economia" = Σ por item de (tabela − cobrado).

/**
 * CIT-22: cor computada de um token de cor qualquer, lida de um elemento sonda,
 * para os testes não fixarem o valor do token.
 * @param {import('@playwright/test').Page} page
 * @param {string} token
 */
async function corToken(page, token) {
  return page.evaluate((tok) => {
    const sonda = document.createElement('div');
    sonda.style.backgroundColor = `var(${tok})`;
    document.body.appendChild(sonda);
    const cor = getComputedStyle(sonda).backgroundColor;
    sonda.remove();
    return cor;
  }, token);
}

/**
 * CIT-22: contraste (WCAG) de um elemento contra um token de cor de fundo específico — usado para o
 * card selecionado da landing, cujo fundo é um gradiente (a cor efetiva não dá para compor via
 * backgroundColor dos ancestrais); a decisão do plano mede contra `--cit-blue-50` (pior ponto do gradiente).
 * @param {import('@playwright/test').Page} page
 * @param {string} seletor
 * @param {string} tokenFundo
 */
async function contrasteContraFundo(page, seletor, tokenFundo) {
  return page.evaluate(([sel, tok]) => {
    const rgba = (/** @type {string} */ c) => (c.match(/[\d.]+/g) || []).map(Number);
    const lum = (/** @type {number[]} */ [r, g, b]) => {
      const f = (/** @type {number} */ v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const sonda = document.createElement('div');
    sonda.style.backgroundColor = `var(${tok})`;
    document.body.appendChild(sonda);
    const fundo = rgba(getComputedStyle(sonda).backgroundColor);
    sonda.remove();
    const el = /** @type {Element} */ (document.querySelector(sel));
    const cor = rgba(getComputedStyle(el).color);
    const l1 = lum(cor.slice(0, 3));
    const l2 = lum(fundo.slice(0, 3));
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }, [seletor, tokenFundo]);
}

test.describe('landing — CIT-22: economia com e sem volume no mensal (CA3)', { tag: '@CIT-22' }, () => {
  test('10×5GB mensal: tabela, −15% contratação, −5% volume e economia', async ({ page, erros }) => {
    await page.goto('index.html');
    await page.evaluate(() => updateQty('5gb', '10'));
    await expect(page.locator('#csSummaryLines .cs-disc')).toHaveText(
      'de R$ 117,60 · −15% contratação −R$ 17,60 · −5% volume −R$ 5,00'
    );
    await expect(page.locator('#csTotal')).toHaveText('R$ 95,00');
    await expect(page.locator('#csEconomia')).toHaveText('Você economiza R$ 22,60/mês');
  });

  test('4×5GB mensal: sem volume, só a contratação', async ({ page, erros }) => {
    await page.goto('index.html');
    await page.evaluate(() => updateQty('5gb', '4'));
    await expect(page.locator('#csSummaryLines .cs-disc')).toHaveText('de R$ 47,04 · −15% contratação −R$ 7,04');
    await expect(page.locator('#csTotal')).toHaveText('R$ 40,00');
    await expect(page.locator('#csEconomia')).toHaveText('Você economiza R$ 7,04/mês');
  });

  test('5×5GB mensal: "−15% contratação" é Σ(tabela − atual), não 15% da tabela (−R$ 8,80, não 8,82)', async ({ page, erros }) => {
    await page.goto('index.html');
    await page.evaluate(() => updateQty('5gb', '5'));
    await expect(page.locator('#csSummaryLines .cs-disc')).toContainText('−15% contratação −R$ 8,80');
    await expect(page.locator('#csSummaryLines .cs-disc')).not.toContainText('8,82');
  });
});

test.describe('landing — CIT-22: rótulos com 15% e sem frases de urgência falsa (CA4)', { tag: '@CIT-22' }, () => {
  const PROIBIDAS = [/volta ao preço/i, /voltará/i, /por tempo limitado/i, /oferta termina/i, /até o dia/i, /últimos dias/i, /preço original/i, /somente hoje/i];

  test('"15%" aparece no texto da seção de preços e na .discount-info', async ({ page, erros }) => {
    await page.goto('index.html');
    await expect(page.locator('#pricing .section-header p')).toContainText('15%');
    await expect(page.locator('.discount-info')).toContainText('15%');
  });

  test('.discount-info, cards de conta e .calc-summary não citam frases de urgência falsa (lista fechada)', async ({ page, erros }) => {
    await page.goto('index.html');
    await page.evaluate(() => updateQty('5gb', '2'));

    const textos = await page.evaluate(() => {
      const sels = ['.discount-info', '#card5', '#card25', '#card50', '.calc-summary'];
      return sels.map(sel => /** @type {[string, string]} */ ([sel, document.querySelector(sel)?.textContent || '']));
    });
    for (const [sel, texto] of textos) {
      for (const re of PROIBIDAS) expect(texto, `${sel} não deveria casar com ${re}`).not.toMatch(re);
    }
  });
});

test.describe('landing — CIT-22: cards sem quantidade mostram a tabela riscada (CA5)', { tag: '@CIT-22' }, () => {
  test('mensal: "de"/"por" nos três cards, sem quantidade', async ({ page, erros }) => {
    await page.goto('index.html');
    await expect(page.locator('#card5 .atc-unit-tabela')).toHaveText('de R$ 11,76');
    await expect(page.locator('#unitPrice5')).toHaveText('por R$ 10,00');
    await expect(page.locator('#card25 .atc-unit-tabela')).toHaveText('de R$ 18,82');
    await expect(page.locator('#unitPrice25')).toHaveText('por R$ 16,00');
    await expect(page.locator('#card50 .atc-unit-tabela')).toHaveText('de R$ 29,41');
    await expect(page.locator('#unitPrice50')).toHaveText('por R$ 25,00');
    // Guarda de regressão (CA1): o primeiro <strong> do aviso de desconto não muda nesta história.
    await expect(page.locator('.discount-info strong').first()).toHaveText('Mínimo de 2 contas no plano de 5 GB.');
  });

  test('anual: "de"/"por" nos três cards, sem quantidade', async ({ page, erros }) => {
    await page.goto('index.html');
    await page.locator('#billingToggle').click();
    await expect(page.locator('#card5 .atc-unit-tabela')).toHaveText('de R$ 11,76');
    await expect(page.locator('#unitPrice5')).toHaveText('por R$ 8,00');
    await expect(page.locator('#card25 .atc-unit-tabela')).toHaveText('de R$ 18,82');
    await expect(page.locator('#unitPrice25')).toHaveText('por R$ 12,80');
    await expect(page.locator('#card50 .atc-unit-tabela')).toHaveText('de R$ 29,41');
    await expect(page.locator('#unitPrice50')).toHaveText('por R$ 20,00');
  });
});

test.describe('landing — CIT-22: subtotal do card com quantidade (CA6)', { tag: '@CIT-22' }, () => {
  test('2×5GB mensal: de/por/economia no card', async ({ page, erros }) => {
    await page.goto('index.html');
    await page.evaluate(() => updateQty('5gb', '2'));
    await expect(page.locator('#origPrice5')).toHaveText('R$ 23,52');
    await expect(page.locator('#finalPrice5')).toHaveText('por R$ 20,00/mês');
    await expect(page.locator('#saving5')).toHaveText('economia −R$ 3,52/mês');
  });
});

test.describe('landing — CIT-22: resumo da calculadora linha a linha (CA6)', { tag: '@CIT-22' }, () => {
  test('2×5GB mensal: linha, cascata, "Total de tabela", total e economia', async ({ page, erros }) => {
    await page.goto('index.html');
    await page.evaluate(() => updateQty('5gb', '2'));

    const linha = page.locator('#csSummaryLines .cs-line').first();
    await expect(linha.locator('.lbl')).toHaveText('2× E-mail 5 GB');
    await expect(linha.locator('.val')).toHaveText('R$ 20,00');
    await expect(page.locator('#csSummaryLines .cs-disc')).toHaveText('de R$ 23,52 · −15% contratação −R$ 3,52');

    const totalTabela = page.locator('#csSummaryLines .cs-line').last();
    await expect(totalTabela.locator('.lbl')).toHaveText('Total de tabela');
    await expect(totalTabela.locator('.val')).toHaveText('R$ 23,52');
    await expect(page.locator('#csTotal')).toHaveText('R$ 20,00');
    await expect(page.locator('#csEconomia')).toHaveText('Você economiza R$ 3,52/mês');
  });

  test('2×5GB anual: linha, cascata com −20% anual, "Total de tabela", total e economia anual', async ({ page, erros }) => {
    await page.goto('index.html');
    await page.evaluate(() => { updateQty('5gb', '2'); setBilling('annual'); });

    const linha = page.locator('#csSummaryLines .cs-line').first();
    await expect(linha.locator('.lbl')).toHaveText('2× E-mail 5 GB');
    await expect(linha.locator('.val')).toHaveText('R$ 16,00');
    await expect(page.locator('#csSummaryLines .cs-disc')).toHaveText('de R$ 23,52 · −15% contratação −R$ 3,52 · −20% anual −R$ 4,00');

    const totalTabela = page.locator('#csSummaryLines .cs-line').last();
    await expect(totalTabela.locator('.val')).toHaveText('R$ 23,52');
    await expect(page.locator('#csTotal')).toHaveText('R$ 16,00');
    await expect(page.locator('#csEconomia')).toHaveText('Você economiza R$ 7,52/mês (R$ 90,24/ano)');
  });

  test('2×5GB + 1×25GB mensal: nenhuma linha "Desc.", uma .cs-disc por tipo, e todo riscado do resumo é valor de tabela', async ({ page, erros }) => {
    await page.goto('index.html');
    await page.evaluate(() => { updateQty('5gb', '2'); updateQty('25gb', '1'); });

    const rotulos = await page.locator('#csSummaryLines .cs-line .lbl').allTextContents();
    expect(rotulos.some(r => r.startsWith('Desc.')), `rótulos: ${rotulos.join(', ')}`).toBe(false);
    await expect(page.locator('#csSummaryLines .cs-disc')).toHaveCount(2);

    const riscados = await page.locator('#csLines s').allTextContents();
    expect(riscados).toEqual(['R$ 23,52', 'R$ 18,82', 'R$ 42,34']);
    expect(riscados).not.toContain('R$ 20,00');
    expect(riscados).not.toContain('R$ 36,00');
  });
});

test.describe('landing — CIT-22: paridade com o checkout e selo de volume só no mensal (CA7)', { tag: '@CIT-22' }, () => {
  /** @type {{ tipo: '5gb'|'25gb'|'50gb', qty: number, anual: boolean, total: string }[]} */
  const CASOS = [
    { tipo: '5gb', qty: 5, anual: true, total: 'R$ 40,00' },
    { tipo: '25gb', qty: 5, anual: false, total: 'R$ 76,00' },
    { tipo: '5gb', qty: 2, anual: true, total: 'R$ 16,00' },
  ];

  for (const c of CASOS) {
    test(`${c.qty}×${c.tipo} ${c.anual ? 'anual' : 'mensal'}: #csTotal igual ao #sumTotal do checkout`, async ({ page, erros }) => {
      await page.goto('index.html');
      await page.evaluate(([tipo, qty, anual]) => {
        // @ts-ignore — tipo vem de ACCOUNT_TYPES, definido no script inline da página
        updateQty(tipo, String(qty));
        if (anual) setBilling('annual');
      }, [c.tipo, c.qty, c.anual]);
      await expect(page.locator('#csTotal')).toHaveText(c.total);
    });
  }

  test('selo "−5% por volume aplicado" e dica de volume só aparecem no mensal', async ({ page, erros }) => {
    await page.goto('index.html');
    await page.evaluate(() => updateQty('5gb', '5'));
    await expect(page.locator('#discTag5')).toContainText('volume aplicado');

    await page.evaluate(() => setBilling('annual'));
    await expect(page.locator('#discTag5')).toHaveText('');
  });

  test('dica "Adicione mais N conta(s)" aparece no mensal com menos de 5 contas e fica ausente no anual', async ({ page, erros }) => {
    await page.goto('index.html');
    await page.evaluate(() => updateQty('5gb', '2'));
    await expect(page.locator('#discTag5')).toContainText('Adicione mais 3 conta(s)');

    await page.evaluate(() => setBilling('annual'));
    await expect(page.locator('#discTag5')).toHaveText('');
  });

  for (const c of CASOS) {
    test(`${c.qty}×${c.tipo} ${c.anual ? 'anual' : 'mensal'}: seguindo o href do CTA, #sumTotal do checkout confere com o #csTotal lido antes`, async ({ page, erros }) => {
      await page.goto('index.html');
      await page.evaluate(([tipo, qty, anual]) => {
        // @ts-ignore — tipo vem de ACCOUNT_TYPES, definido no script inline da página
        updateQty(tipo, String(qty));
        if (anual) setBilling('annual');
      }, [c.tipo, c.qty, c.anual]);

      const totalLanding = (await page.locator('#csTotal').textContent()).trim();
      expect(totalLanding).toBe(c.total);
      const href = await page.locator('#calcCtaBtn').getAttribute('href');

      await page.goto(/** @type {string} */ (href));
      await expect(page.locator('#sumTotal')).toHaveText(totalLanding);
    });
  }
});

test.describe('landing — CIT-22: cores dos riscados e dos preços cobrados (CA12)', { tag: '@CIT-22' }, () => {
  test('riscado usa --cit-error; preço final e economia usam --cit-success-strong, nunca --cit-success nem --gray-400', async ({ page, erros }) => {
    await page.goto('index.html');
    await page.evaluate(() => updateQty('5gb', '2'));

    const erro = await corToken(page, '--cit-error');
    const sucessoForte = await corToken(page, '--cit-success-strong');
    const sucesso = await corToken(page, '--cit-success');
    const cinza400 = await corToken(page, '--gray-400');
    expect(sucessoForte).not.toBe(sucesso);

    await expect(page.locator('#card5 [data-preco-tabela="conta:5gb"]')).toHaveCSS('color', erro);
    await expect(page.locator('#finalPrice5')).toHaveCSS('color', sucessoForte);
    await expect(page.locator('#csEconomia')).toHaveCSS('color', sucessoForte);
    await expect(page.locator('#finalPrice5')).not.toHaveCSS('color', sucesso);
    await expect(page.locator('#csEconomia')).not.toHaveCSS('color', sucesso);

    // "Total de tabela" (linha final do resumo): nem --cit-success nem --gray-400 (era grandFull em --gray-400 antes da CIT-22).
    const totalTabelaVal = page.locator('#csSummaryLines .cs-line').last().locator('.val');
    await expect(totalTabelaVal).not.toHaveCSS('color', cinza400);
    await expect(totalTabelaVal).not.toHaveCSS('color', sucesso);
  });

  test('.atc-unit-price .price e .cs-line .val do item usam --cit-success-strong; #csTotal (total geral) não muda', async ({ page, erros }) => {
    await page.goto('index.html');
    await page.evaluate(() => updateQty('5gb', '2'));

    const sucessoForte = await corToken(page, '--cit-success-strong');
    await expect(page.locator('#card5 .atc-unit-price .price')).toHaveCSS('color', sucessoForte);
    await expect(page.locator('#csSummaryLines .cs-line .val').first()).toHaveCSS('color', sucessoForte);

    // Guarda de regressão (CA12): #csTotal (total geral da calculadora) mantém a cor de hoje.
    await expect(page.locator('#csTotal')).not.toHaveCSS('color', sucessoForte);
  });
});

test.describe('landing — CIT-22: contraste no card selecionado, medido contra --cit-blue-50 (CA13)', { tag: '@CIT-22' }, () => {
  test('riscado e preço cobrado têm contraste de pelo menos 4,5:1 no pior ponto do gradiente do card selecionado', async ({ page, erros }) => {
    await page.goto('index.html');
    await page.evaluate(() => updateQty('5gb', '2'));
    await expect(page.locator('#card5')).toHaveClass(/has-qty/);

    const cRiscado = await contrasteContraFundo(page, '#card5 [data-preco-tabela="conta:5gb"]', '--cit-blue-50');
    const cFinal = await contrasteContraFundo(page, '#card5 .price-final', '--cit-blue-50');
    expect(cRiscado, 'contraste do riscado no card selecionado').toBeGreaterThanOrEqual(4.5);
    expect(cFinal, 'contraste do preço cobrado no card selecionado').toBeGreaterThanOrEqual(4.5);
  });
});

test.describe('landing — CIT-22: riscado e cobrado não dependem só de cor (CA14)', { tag: '@CIT-22' }, () => {
  test('o riscado é anunciado com "de"/"por" em texto e a cascata usa o sinal "−" (U+2212), não hífen', async ({ page, erros }) => {
    await page.goto('index.html');
    await page.evaluate(() => { updateQty('5gb', '2'); setBilling('annual'); });

    await expect(page.locator('#card5 .atc-unit-tabela .sr-only')).toHaveText('de ');
    await expect(page.locator('#unitPrice5 .sr-only')).toHaveText('por ');
    const disc = /** @type {string} */ (await page.locator('#csSummaryLines .cs-disc').first().textContent());
    expect(disc).toContain('−15% contratação −R$');
    expect(disc.replace(/−/g, '')).not.toContain('-R$');
  });
});

test.describe('landing — CIT-22: resumo sticky só acima de 960px, sem transbordo horizontal (CA15)', { tag: '@CIT-22' }, () => {
  /** @type {[number, number][]} */
  const LARGURAS = [[360, 740], [412, 839], [961, 900], [1280, 900]];

  for (const [largura, altura] of LARGURAS) {
    test(`${largura}x${altura}, 3 tipos no mensal e no anual: .calc-summary sticky só acima de 960px, sem transbordo`, async ({ page, erros }) => {
      await page.setViewportSize({ width: largura, height: altura });
      await page.goto('index.html');
      await page.evaluate(() => { updateQty('5gb', '5'); updateQty('25gb', '1'); updateQty('50gb', '1'); });

      for (const anual of [false, true]) {
        if (anual) await page.evaluate(() => setBilling('annual'));
        const posicao = await page.evaluate(() => getComputedStyle(/** @type {Element} */ (document.querySelector('.calc-summary'))).position);
        const esperado = largura <= 960 ? 'static' : 'sticky';
        expect(posicao, `${largura}x${altura}, ${anual ? 'anual' : 'mensal'}: position do .calc-summary`).toBe(esperado);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, `${largura}x${altura}, ${anual ? 'anual' : 'mensal'}: rolagem horizontal do documento`).toBeLessThanOrEqual(0);
      }
    });
  }

  for (const largura of [360, 412]) {
    test(`largura ${largura}px, mensal com 5×5GB: #card5 sem transbordo horizontal`, async ({ page, erros }) => {
      await page.setViewportSize({ width: largura, height: 740 });
      await page.goto('index.html');
      await page.evaluate(() => updateQty('5gb', '5'));
      const m = await page.evaluate(() => {
        const el = /** @type {HTMLElement} */ (document.getElementById('card5'));
        return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth };
      });
      expect(m.scrollWidth, `largura ${largura}px: #card5 transborda`).toBeLessThanOrEqual(m.clientWidth);
    });
  }
});

test.describe('landing — CIT-22: fonte única de preços, sem valor fixo no HTML bruto (CA17)', { tag: '@CIT-22' }, () => {
  test('3 .account-type-card, sem preço fixo fora de PRECOS, sem chaves antigas', async ({ page, baseURL, erros }) => {
    await page.goto('index.html');

    const resp = await page.request.get(new URL('index.html', baseURL).toString());
    const html = await resp.text();
    const resultado = await page.evaluate((rawHtml) => {
      const doc = new DOMParser().parseFromString(rawHtml, 'text/html');
      const contadores = { '.account-type-card': doc.querySelectorAll('.account-type-card').length };
      const regex = /\d+,\d\d/g;
      const achados = [];
      doc.querySelectorAll('.account-type-card').forEach(el => {
        const casados = (el.textContent.match(regex) || []).filter(v => v !== '0,00');
        if (casados.length) achados.push(`.account-type-card#${el.id || ''}: ${casados.join(',')}`);
      });
      return { contadores, achados };
    }, html);

    expect(resultado.contadores, 'contagem de .account-type-card').toEqual({ '.account-type-card': 3 });
    expect(resultado.achados, 'preço fixo no HTML bruto da landing (sem executar JS)').toEqual([]);

    const chaves = await page.evaluate(() => ({
      accountTypesComBase: Object.values(ACCOUNT_TYPES).some(d => 'base' in d),
      elementosComDataBase: document.querySelectorAll('[data-base]').length,
    }));
    expect(chaves).toEqual({ accountTypesComBase: false, elementosComDataBase: 0 });
  });
});

test.describe('landing — CIT-22: paridade da cascata de preços entre landing e checkout (CA7)', { tag: '@CIT-22' }, () => {
  /**
   * Lê, na página atual, o resultado de cascataCentavos/PRECOS.contas numa grade tipo × qtd (0..12) × ciclo.
   * cascataCentavos e PRECOS vêm de assets/precos.js, carregado por ambas as páginas — o mesmo helper
   * roda em cada uma para comparar por igualdade profunda.
   * @param {import('@playwright/test').Page} page
   */
  async function gradeCascata(page) {
    return page.evaluate(() => {
      const tipos = ['5gb', '25gb', '50gb'];
      const grade = [];
      for (const tipo of tipos) {
        for (let qty = 0; qty <= 12; qty++) {
          for (const anual of [false, true]) {
            grade.push(cascataCentavos(PRECOS.contas[tipo], qty, { conta: true, anual }));
          }
        }
      }
      return { grade, contas: PRECOS.contas };
    });
  }

  test('cascataCentavos e PRECOS.contas são idênticos entre landing e checkout, numa grade tipo × qtd 0..12 × ciclo', async ({ page, erros }) => {
    await page.goto('index.html');
    const daLanding = await gradeCascata(page);

    await page.goto('checkout.html');
    const doCheckout = await gradeCascata(page);

    expect(doCheckout, 'cascataCentavos/PRECOS.contas do checkout deveriam ser idênticos aos da landing').toEqual(daLanding);
  });

  test('index.html e checkout.html carregam o mesmo assets/precos.js?v=', async ({ page, erros }) => {
    // O Vite reescreve "assets/..." para "/citmail/assets/..." só ao servir index.html (não checkout.html,
    // caminho pré-existente e fora do escopo desta história); por isso a comparação usa só o "?v=", não o
    // atributo src inteiro.
    await page.goto('index.html');
    const srcLanding = await page.evaluate(() => document.querySelector('script[src*="precos.js"]')?.getAttribute('src'));
    expect(srcLanding).toMatch(/\bassets\/precos\.js\?v=\d+$/);
    const vLanding = srcLanding.match(/\?v=(\d+)$/)[1];

    await page.goto('checkout.html');
    const srcCheckout = await page.evaluate(() => document.querySelector('script[src*="precos.js"]')?.getAttribute('src'));
    expect(srcCheckout).toMatch(/\bassets\/precos\.js\?v=\d+$/);
    const vCheckout = srcCheckout.match(/\?v=(\d+)$/)[1];

    expect(vCheckout, 'checkout.html deveria carregar o mesmo ?v= de assets/precos.js que a landing').toBe(vLanding);
  });
});

// CIT-22: guarda de carga quando assets/precos.js não carrega. Este teste ESPERA erro de rede/console
// de propósito (aborta o script e confere o aviso), por isso não usa a fixture `erros` — usa o `test`
// puro do Playwright (testSemErros), que não falha ao ver erros registrados.
testSemErros.describe('landing — CIT-22: guarda quando assets/precos.js não carrega', { tag: '@CIT-22' }, () => {
  testSemErros('mostra o aviso "Não foi possível carregar os preços. Recarregue a página." no lugar da calculadora', async ({ page }) => {
    await page.route('**/assets/precos.js*', route => route.abort());
    await page.goto('index.html');
    await expect(page.locator('#pricing .calc-wrapper .discount-info[role="alert"]')).toHaveText(
      'Não foi possível carregar os preços. Recarregue a página.'
    );
  });

  // CIT-22, revisão 2º ciclo: só a calculadora (precosOk) sai cedo; header, menu, FAQ e fade-in continuam
  // funcionando sem assets/precos.js. Erros de rede/console do recurso abortado são esperados (por isso
  // testSemErros, sem a fixture `erros`); o que este teste garante é que não há pageerror (script não
  // capturado) além do aviso — sinal de que a guarda não deixou nenhuma outra função sem proteção.
  testSemErros('sem assets/precos.js, o resto da página (fade-in, FAQ e menu mobile) continua funcionando, sem pageerror', async ({ page }) => {
    const pageerrors = [];
    page.on('pageerror', err => pageerrors.push(err.message));
    await page.route('**/assets/precos.js*', route => route.abort());
    await page.setViewportSize({ width: 412, height: 839 }); // largura mobile: exibe o nav-toggle (@media max-width: 900px)
    await page.goto('index.html');
    await expect(page.locator('#pricing .calc-wrapper .discount-info[role="alert"]')).toHaveText(
      'Não foi possível carregar os preços. Recarregue a página.'
    );

    // fade-in: rolar até #features aplica "visible" (IntersectionObserver, independente de precosOk)
    const featuresHeader = page.locator('#features .section-header');
    await featuresHeader.scrollIntoViewIfNeeded();
    await expect(featuresHeader).toHaveClass(/visible/);

    // FAQ: clicar numa pergunta abre a resposta (toggleFaq não depende de precosOk)
    const primeiroFaq = page.locator('.faq-item').first();
    await primeiroFaq.locator('.faq-question').click();
    await expect(primeiroFaq).toHaveClass(/open/);

    // menu mobile: abre ao clicar no botão (setNavOpen não depende de precosOk)
    await page.locator('#navToggle').click();
    await expect(page.locator('#header')).toHaveClass(/nav-mobile-open/);

    expect(pageerrors, 'não deveria haver pageerror com a guarda de carga').toEqual([]);
  });
});
