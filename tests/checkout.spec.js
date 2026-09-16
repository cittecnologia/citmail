// @ts-check
import { test, expect } from './fixtures.js';

// CIT-15: ajuste de textos e componentes do checkout (checkout.html).
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

// CIT-19: layout, rolagem e tipografia do checkout (checkout.html).

/**
 * Tamanho de fonte computado de uma variável CSS, lido de um elemento sonda,
 * para os testes de tipografia não fixarem o valor do token.
 * @param {import('@playwright/test').Page} page
 * @param {string} token nome da variável CSS, ex.: '--cit-text-small'
 */
async function tamanhoToken(page, token) {
  return page.evaluate((tok) => {
    const sonda = document.createElement('div');
    sonda.style.fontSize = `var(${tok})`;
    document.body.appendChild(sonda);
    const tam = getComputedStyle(sonda).fontSize;
    sonda.remove();
    return tam;
  }, token);
}

/**
 * Mede a barra de etapas (#stepsBar) no passo indicado: transbordo do documento e da
 * própria barra, posição em relação ao resumo (duas colunas), rótulo ativo, rótulos
 * cortados/fora da .main-col e tamanho dos círculos. Mesma lógica dos scripts de
 * medição do architect (scratchpad/cit19/exec-medir.cjs).
 * @param {import('@playwright/test').Page} page
 * @param {number} passo
 */
async function medirBarra(page, passo) {
  return page.evaluate((n) => {
    goStep(n);
    const doc = document.documentElement;
    const bar = document.getElementById('stepsBar');
    const mc = document.querySelector('.main-col');
    const sum = document.getElementById('orderSummary');
    const mcR = mc.getBoundingClientRect();
    const sumR = sum.getBoundingClientRect();
    const barRight = Math.max(...[...bar.children].map(k => k.getBoundingClientRect().right));
    const labels = [...bar.querySelectorAll('.step-label')].filter(l => getComputedStyle(l).display !== 'none');
    const ativo = bar.querySelector('.step-label.active');
    const duasColunas = getComputedStyle(document.querySelector('.checkout-wrapper')).gridTemplateColumns.trim().split(/\s+/).length > 1;
    return {
      docOverflow: doc.scrollWidth - doc.clientWidth,
      barOverflow: bar.scrollWidth - bar.clientWidth,
      mcWidth: mcR.width,
      barRight, sumLeft: sumR.left, duasColunas,
      nLabels: labels.length,
      ativoVisivel: !!ativo && getComputedStyle(ativo).display !== 'none',
      ativoCortado: ativo ? ativo.scrollWidth > ativo.clientWidth + 1 : true,
      labelsCortados: labels.filter(l => {
        const b = l.getBoundingClientRect();
        return l.scrollWidth > l.clientWidth + 1 || b.left < mcR.left - 0.5 || b.right > mcR.right + 0.5;
      }).map(l => l.id),
      circulos: [...bar.querySelectorAll('.step-circle')].map(c => {
        const b = c.getBoundingClientRect();
        return { w: Math.round(b.width), h: Math.round(b.height) };
      }),
    };
  }, passo);
}

/**
 * Preenche o checkout com dados pesados (quantidades altas nos 3 planos, todos os
 * add-ons, Skybox 1 TB e domínio/e-mail fictícios longos) para os testes de
 * transbordo e do resumo sticky. Reaproveita as mesmas funções globais do
 * checkout.html usadas nos scripts de medição do architect (scratchpad/cit19/exec-medir.cjs).
 * @param {import('@playwright/test').Page} page
 */
async function preencherCheckoutPesado(page) {
  await page.evaluate(() => {
    for (let i = 0; i < 40; i++) { ckChangeQty('5gb', 1); ckChangeQty('25gb', 1); ckChangeQty('50gb', 1); }
    ['talk', 'backup90', 'backup365', 'grupoEmail', 'skybox', 'extraDom'].forEach(k => { for (let i = 0; i < 40; i++) addonChange(k, 1); });
    try { selectSkybox('1tb'); } catch (e) {}
    selectDomainOpt('new-br');
    document.getElementById('fDomNew').value = 'empresaficticiacomnomebemcomprido';
    try { onDomNewInput(); } catch (e) {}
    document.getElementById('successWebmail').textContent = 'webmail.empresaficticiacomnomemuitolongoparateste.com.br';
    document.getElementById('successEmail').textContent = 'contato.financeiro@empresaficticiacomnomemuitolongo.com.br';
  });
}

// Larguras da barra: limiares do container (300px/460px) e do grid (960/961).
const LARGURAS_BARRA = [320, 412, 521, 744, 960, 961, 1024, 1243, 1920];

// Seletores cujo font-size deve ser var(--cit-text-small) após a CIT-19 (tarefa #24).
// .sum-empty fica de fora: só existe com o checkout vazio (testado à parte).
const SELETORES_TIPO_SMALL = [
  '.step-label', '.step-circle',
  '.mini-row-price', '.mini-row-disc', '.cycle-toggle .left',
  '.opt-desc', '.opt-price-note', '.domain-tld', '.domain-at',
  '.addon-desc', '.addon-price', '.addon-period', '.sky-opts-title', '.sky-opt-name', '.sky-opt-price', '.sky-qty-label', '.addon-sub-line', '.addons-subtotal-head',
  '.field label', '.field-hint', '.field-error', '.doc-type-btn', '.terms-check',
  '.payment-desc', '.pix-box-desc', '.pix-copy-label', '.pix-note', '.pix-copy', '.pix-timer', '.pix-status', '.asaas-notice',
  '.access-label', '.access-value', '.access-item', '.success-help',
  '.alert-box', '.btn-back-row',
  '.summary-plan-cycle', '.sum-lines', '.sum-disc', '.summary-feature', '.secure-badge', '.summary-total .period',
];
// Seletores cujo font-size deve ser var(--cit-text-body).
const SELETORES_TIPO_BODY = [
  '.mini-row-name', '.mini-qty-val', '.mini-row-sub',
  '.opt-name',
  '.addon-name', '.addon-sub-val',
  '.field input', '.installments-select',
];

test.describe('checkout — ciclo de cobrança', { tag: '@CIT-15' }, () => {
  test('toggle do ciclo fica verde com ?cycle=annual e alterna ao clicar', async ({ page, erros }) => {
    await page.goto('checkout.html?cycle=annual');
    const verde = await corSucesso(page);
    const toggle = page.locator('#cycleMini');
    await expect(toggle).toHaveCSS('background-color', verde);

    await page.locator('#cycleToggle').click();
    await expect(toggle).not.toHaveCSS('background-color', verde);

    await page.locator('#cycleToggle').click();
    await expect(toggle).toHaveCSS('background-color', verde);
  });
});

test.describe('checkout — quantidade de contas', { tag: '@CIT-15' }, () => {
  test('quantidade mínima por tipo via parâmetros de URL (qty5=1&qty25=1&qty50=-3)', async ({ page, erros }) => {
    await page.goto('checkout.html?qty5=1&qty25=1&qty50=-3');
    await expect(page.locator('#ckQty5')).toHaveValue('2');
    await expect(page.locator('#ckQty25')).toHaveValue('1');
    await expect(page.locator('#ckQty50')).toHaveValue('0');
  });

  test('parâmetros de URL inválidos ou fracionários (qty50=1&qty5=abc&qty25=2.7)', async ({ page, erros }) => {
    await page.goto('checkout.html?qty50=1&qty5=abc&qty25=2.7');
    await expect(page.locator('#ckQty50')).toHaveValue('1');
    await expect(page.locator('#ckQty5')).toHaveValue('0');
    await expect(page.locator('#ckQty25')).toHaveValue('2');
  });

  test('plano de 5 GB: botões e digitação respeitam o mínimo de 2 contas', async ({ page, erros }) => {
    await page.goto('checkout.html');
    const botoes = page.locator('#ckCard5 .mini-qty-btn');
    const diminuir = botoes.first();
    const aumentar = botoes.last();
    const input = page.locator('#ckQty5');

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
    await page.goto('checkout.html');
    const input = page.locator('#ckQty5');
    await input.fill('3');
    await input.press('Tab');
    await expect(input).toHaveValue('3');

    await page.locator('#ckCard5 .mini-qty-btn').first().click();
    await expect(input).toHaveValue('2');
  });

  test('planos de 25 GB e 50 GB aceitam quantidade mínima de 1 conta', async ({ page, erros }) => {
    await page.goto('checkout.html');
    const qty25 = page.locator('#ckQty25');
    const qty50 = page.locator('#ckQty50');

    await page.locator('#ckCard25 .mini-qty-btn').last().click();
    await expect(qty25).toHaveValue('1');

    await page.locator('#ckCard25 .mini-qty-btn').first().click();
    await expect(qty25).toHaveValue('0');

    await qty50.fill('1');
    await qty50.press('Tab');
    await expect(qty50).toHaveValue('1');
  });
});

test.describe('checkout — domínio', { tag: '@CIT-15' }, () => {
  test('opção de registro de domínio .com foi removida', async ({ page, erros }) => {
    await page.goto('checkout.html');
    await expect(page.locator('#doptCom')).toHaveCount(0);
    // guarda de regressão: a opção .com.br continua disponível
    await expect(page.locator('#doptBr')).toHaveCount(1);
  });

  test('fluxo até o passo 3 com domínio .com.br novo conclui sem erros', async ({ page, erros }) => {
    await page.route('https://viacep.com.br/**', route => route.abort());
    await page.goto('checkout.html');

    await page.locator('#ckCard5 .mini-qty-btn').last().click();
    await page.locator('#step1 .btn-primary').click();
    await expect(page.locator('#step1Error')).toBeHidden();

    await page.locator('#doptBr').click();
    await page.locator('#fDomNew').fill('minhaempresateste');
    await page.locator('#step2 .btn-primary').click();

    await expect(page.locator('#step2Error')).toBeHidden();
    await expect(page.locator('#step3')).toHaveClass(/active/);
    await expect(page.locator('#successWebmail')).toHaveText('webmail.minhaempresateste.com.br');
  });

  test('fluxo até o passo 3 com domínio existente conclui sem erros', async ({ page, erros }) => {
    await page.route('https://viacep.com.br/**', route => route.abort());
    await page.goto('checkout.html');

    await page.locator('#ckCard5 .mini-qty-btn').last().click();
    await page.locator('#step1 .btn-primary').click();
    await expect(page.locator('#step1Error')).toBeHidden();

    await page.locator('#doptExist').click();
    await page.locator('#fDomExist').fill('minhaempresateste.com.br');
    await page.locator('#step2 .btn-primary').click();

    await expect(page.locator('#step2Error')).toBeHidden();
    await expect(page.locator('#step3')).toHaveClass(/active/);
  });
});

test.describe('checkout — textos', { tag: '@CIT-15' }, () => {
  test('texto de mínimo de contas mantém a frase de desconto do checkout', async ({ page, erros }) => {
    await page.goto('checkout.html');
    await expect(page.locator('.step-intro').first()).toHaveText(
      'Escolha a quantidade de contas de cada tipo. Mínimo de 2 contas no plano de 5 GB. Desconto de 5% a partir de 5 contas do mesmo tipo (não se aplica ao plano anual).'
    );
  });

  test('nenhuma referência a prazo de "5 min" resta no HTML do checkout', async ({ page, erros }) => {
    await page.goto('checkout.html');
    const html = await page.content();
    expect(html).not.toMatch(/\b5(?:\s|&nbsp;)*min/i);
  });

  test('<title> do checkout permanece inalterado', async ({ page, erros }) => {
    await page.goto('checkout.html');
    await expect(page).toHaveTitle('Contratar Plano — CITMail');
  });
});

test.describe('checkout — barra de etapas', { tag: '@CIT-19' }, () => {
  for (const largura of LARGURAS_BARRA) {
    test(`largura ${largura}px: sem transbordo e rótulos corretos nos passos 1 e 6`, async ({ page, erros }) => {
      await page.goto('checkout.html?qty5=2');
      await page.evaluate(() => document.fonts.ready);
      await page.setViewportSize({ width: largura, height: 800 });

      for (const passo of [1, 6]) {
        const m = await medirBarra(page, passo);
        const contexto = `largura ${largura}px, passo ${passo}`;

        expect(m.docOverflow, `${contexto}: documento com rolagem horizontal`).toBeLessThanOrEqual(0);
        expect(m.barOverflow, `${contexto}: #stepsBar transborda`).toBeLessThanOrEqual(0);
        if (m.duasColunas) {
          expect(m.barRight, `${contexto}: barra invade o resumo`).toBeLessThanOrEqual(m.sumLeft + 0.5);
        }
        expect(m.ativoVisivel, `${contexto}: rótulo ativo não está visível`).toBe(true);
        expect(m.ativoCortado, `${contexto}: rótulo ativo está cortado`).toBe(false);
        expect(m.labelsCortados, `${contexto}: rótulos cortados ou fora da .main-col`).toEqual([]);

        const esperado = m.mcWidth >= 460 ? 6 : 1;
        expect(m.nLabels, `${contexto}: quantidade de rótulos visíveis (coluna ${Math.round(m.mcWidth)}px)`).toBe(esperado);

        // Abaixo de 300px de coluna os círculos passam a 32px por design; não faz parte do critério.
        if (m.mcWidth >= 300) {
          for (const c of m.circulos) {
            expect(c.w, `${contexto}: círculo com largura != 36px`).toBe(36);
            expect(c.h, `${contexto}: círculo com altura != 36px`).toBe(36);
          }
        }
      }
    });
  }
});

test.describe('checkout — layout responsivo', { tag: '@CIT-19' }, () => {
  test('960px: coluna única, resumo acima da coluna principal', async ({ page, erros }) => {
    await page.goto('checkout.html');
    await page.evaluate(() => document.fonts.ready);
    await page.setViewportSize({ width: 960, height: 800 });

    const colunas = await page.evaluate(() => getComputedStyle(document.querySelector('.checkout-wrapper')).gridTemplateColumns.trim().split(/\s+/).length);
    expect(colunas, '960px deveria ter uma única trilha no grid').toBe(1);

    const mcBox = await page.locator('.main-col').boundingBox();
    const resumoBox = await page.locator('#orderSummary').boundingBox();
    expect(resumoBox.y, '960px: resumo deveria ficar acima da coluna principal').toBeLessThan(mcBox.y);
  });

  test('961px: duas colunas, resumo ao lado da coluna principal', async ({ page, erros }) => {
    await page.goto('checkout.html');
    await page.evaluate(() => document.fonts.ready);
    await page.setViewportSize({ width: 961, height: 800 });

    const colunas = await page.evaluate(() => getComputedStyle(document.querySelector('.checkout-wrapper')).gridTemplateColumns.trim().split(/\s+/).length);
    expect(colunas, '961px deveria ter duas trilhas no grid').toBe(2);

    const mcBox = await page.locator('.main-col').boundingBox();
    const resumoBox = await page.locator('#orderSummary').boundingBox();
    expect(resumoBox.x, '961px: resumo deveria ficar ao lado da coluna principal').toBeGreaterThanOrEqual(mcBox.x + mcBox.width - 1);
  });

  for (const largura of [320, 412, 961]) {
    test(`largura ${largura}px: sem rolagem horizontal em nenhum passo com dados pesados`, async ({ page, erros }) => {
      await page.route('https://viacep.com.br/**', route => route.abort());
      await page.goto('checkout.html?qty5=2');
      await page.evaluate(() => document.fonts.ready);
      await preencherCheckoutPesado(page);
      await page.setViewportSize({ width: largura, height: 900 });

      const variantes = /** @type {[number, string?][]} */ ([[1], [2], [3], [4], [5, 'pix'], [5, 'boleto'], [5, 'card'], [6]]);
      for (const [passo, pagamento] of variantes) {
        const overflow = await page.evaluate(([n, pay]) => {
          goStep(n);
          if (pay) selectPayment(pay);
          const doc = document.documentElement;
          return doc.scrollWidth - doc.clientWidth;
        }, [passo, pagamento]);
        const id = pagamento ? `${passo}/${pagamento}` : `${passo}`;
        expect(overflow, `largura ${largura}px, passo ${id}: rolagem horizontal do documento`).toBeLessThanOrEqual(0);
      }

      // Passo 6 com webmail fictício longo: precisa caber inteiramente dentro do card.
      const dentroDoCard = await page.evaluate(() => {
        const el = document.getElementById('successWebmail');
        const card = el.closest('.card');
        const b = el.getBoundingClientRect();
        const c = card.getBoundingClientRect();
        return b.left >= c.left - 0.5 && b.right <= c.right + 0.5 && el.scrollWidth <= el.clientWidth + 1;
      });
      expect(dentroDoCard, `largura ${largura}px: #successWebmail transborda do card`).toBe(true);
    });
  }
});

test.describe('checkout — navegação entre passos', { tag: '@CIT-19' }, () => {
  test('mobile (412px): avançar do passo 1 ao 2 rola até a barra de etapas e mostra o título do passo', async ({ page, erros }) => {
    await page.setViewportSize({ width: 412, height: 839 });
    await page.goto('checkout.html?qty5=2');
    await page.evaluate(() => document.fonts.ready);

    await page.locator('#step1 .btn-primary').click();

    await expect.poll(async () => page.evaluate(() => {
      const barTop = document.getElementById('stepsBar').getBoundingClientRect().top;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const titulo = document.querySelector('.step-panel.active .card-title').getBoundingClientRect();
      const tituloVisivel = titulo.top >= 0 && titulo.bottom <= window.innerHeight;
      return barTop >= 60 && (barTop <= 100 || Math.abs(window.scrollY - max) < 1) && tituloVisivel;
    }), {
      message: 'barra de etapas e título do passo 2 deveriam ficar visíveis após a rolagem',
      timeout: 6000,
    }).toBe(true);
  });

  test('desktop (1280px): trocar de passo com a página rolada volta o scroll ao topo', async ({ page, erros }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('checkout.html?qty5=2');
    await page.evaluate(() => document.fonts.ready);
    await preencherCheckoutPesado(page);

    await page.evaluate(() => window.scrollTo(0, 300));
    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), 'a página deveria estar rolada antes de trocar de passo').toBeGreaterThan(0);

    await page.evaluate(() => goStep(3));

    await expect.poll(() => page.evaluate(() => Math.round(window.scrollY)), {
      message: 'scrollY deveria voltar a 0 ao trocar de passo no desktop',
      timeout: 6000,
    }).toBe(0);
  });
});

test.describe('checkout — resumo sticky', { tag: '@CIT-19' }, () => {
  test('1280x720 com resumo cheio: o último selo de segurança fica alcançável rolando', async ({ page, erros }) => {
    await page.route('https://viacep.com.br/**', route => route.abort());
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('checkout.html?qty5=2');
    await page.evaluate(() => document.fonts.ready);
    await preencherCheckoutPesado(page);

    const ultimoSelo = page.locator('.secure-badge').last();
    // Prova de que o resumo realmente transborda antes de rolar (senão o teste seria vazio).
    await expect(ultimoSelo, 'o último selo já apareceria sem rolar — resumo não está transbordando').not.toBeInViewport();

    await ultimoSelo.scrollIntoViewIfNeeded();
    await expect(ultimoSelo, 'o último selo deveria ficar alcançável após rolar').toBeInViewport();
  });
});

test.describe('checkout — tipografia', { tag: '@CIT-19' }, () => {
  for (const largura of [1280, 412]) {
    test(`largura ${largura}px: tamanhos de fonte batem com os tokens --cit-text-small/--cit-text-body`, async ({ page, erros }) => {
      await page.route('https://viacep.com.br/**', route => route.abort());
      await page.goto('checkout.html');
      await page.evaluate(() => document.fonts.ready);
      await page.setViewportSize({ width: largura, height: 900 });

      const small = await tamanhoToken(page, '--cit-text-small');
      const body = await tamanhoToken(page, '--cit-text-body');

      // .sum-empty só existe com o checkout vazio — medir antes de preencher.
      await expect(page.locator('.sum-empty'), `.sum-empty deveria usar --cit-text-small (${small})`).toHaveCSS('font-size', small);

      await preencherCheckoutPesado(page);

      for (const seletor of SELETORES_TIPO_SMALL) {
        await expect(page.locator(seletor).first(), `${seletor} deveria usar --cit-text-small (${small})`).toHaveCSS('font-size', small);
      }
      for (const seletor of SELETORES_TIPO_BODY) {
        await expect(page.locator(seletor).first(), `${seletor} deveria usar --cit-text-body (${body})`).toHaveCSS('font-size', body);
      }

      const totalTitulos = await page.locator('.card-title').count();
      for (let i = 0; i < totalTitulos; i++) {
        await expect(page.locator('.card-title').nth(i), '.card-title deveria ser 20px').toHaveCSS('font-size', '20px');
      }

      // Guarda de regressão: o preço total do resumo não deveria ter sido alterado por esta história.
      await expect(page.locator('.summary-total .price'), '.summary-total .price não deveria mudar').toHaveCSS('font-size', '25.6px');
    });
  }
});
