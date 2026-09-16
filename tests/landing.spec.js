// @ts-check
import { test, expect } from './fixtures.js';

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
  test('toggle mensal/anual fica verde só no anual e volta ao valor original no mensal', async ({ page, erros }) => {
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
