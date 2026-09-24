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
  return page.evaluate(async (n) => {
    goStep(n);
    // Força o layout do passo novo (dispara o carregamento de fontes ainda não usadas) e espera as fontes.
    void document.body.offsetWidth;
    await document.fonts.ready;
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
 * transbordo e do resumo. Chama direto as funções globais do checkout.html: se alguma
 * deixar de existir, o teste falha.
 * @param {import('@playwright/test').Page} page
 */
async function preencherCheckoutPesado(page) {
  await page.evaluate(() => {
    for (let i = 0; i < 40; i++) { ckChangeQty('5gb', 1); ckChangeQty('25gb', 1); ckChangeQty('50gb', 1); }
    ['talk', 'backup90', 'backup365', 'grupoEmail', 'skybox', 'extraDom'].forEach(k => { for (let i = 0; i < 40; i++) addonChange(k, 1); });
    selectSkybox('1tb');
    selectDomainOpt('new-br');
    document.getElementById('fDomNew').value = 'empresaficticiacomnomebemcomprido';
    onDomNewInput();
    document.getElementById('successWebmail').textContent = 'webmail.empresaficticiacomnomemuitolongoparateste.com.br';
    document.getElementById('successEmail').textContent = 'contato.financeiro@empresaficticiacomnomemuitolongo.com.br';
  });
}

/**
 * Lê num único evaluate o font-size computado de TODAS as ocorrências de cada seletor.
 * Elementos que casam com um seletor de exceção são agrupados na chave da exceção.
 * @param {import('@playwright/test').Page} page
 * @param {string[]} seletores
 * @param {string[]} excecoes
 * @returns {Promise<Record<string, string[]>>}
 */
async function lerFontes(page, seletores, excecoes = []) {
  return page.evaluate(([sels, excs]) => {
    /** @type {Record<string, string[]>} */
    const res = {};
    for (const sel of [...sels, ...excs]) res[sel] = [];
    for (const sel of sels) {
      for (const el of document.querySelectorAll(sel)) {
        const exc = excs.find(e => el.matches(e));
        res[exc || sel].push(getComputedStyle(el).fontSize);
      }
    }
    return res;
  }, [seletores, excecoes]);
}

// Larguras da barra: limiares do container (coluna 300px ↔ 331/332; coluna 500px ↔ 543/544)
// e do grid (960/961), além de larguras comuns.
const LARGURAS_BARRA = [320, 331, 332, 412, 500, 521, 543, 544, 744, 960, 961, 1024, 1243, 1920];
// Rótulos visíveis esperados por largura, fixados a partir da geometria medida (coluna ≈ 92% da largura
// até 960px): 543 → coluna 499,6px → só o ativo; 544 → coluna 500,5px → todos.
// O limite de 500px deixa folga para as métricas da fonte no Linux (6 rótulos ≈ 472px) e no Windows (≈ 453px).
const ROTULOS_POR_LARGURA = /** @type {Record<number, number>} */ ({
  320: 1, 331: 1, 332: 1, 412: 1, 500: 1, 521: 1, 543: 1,
  544: 6, 744: 6, 960: 6, 961: 6, 1024: 6, 1243: 6, 1920: 6,
});
// Círculos da barra por largura: 32px só com coluna < 300px (320 → 288px, 331 → 299px).
const CIRCULO_POR_LARGURA = /** @type {Record<number, number>} */ ({ 320: 32, 331: 32 });

// Seletores cujo font-size deve ser var(--cit-text-small) após a CIT-19 (tarefa #24).
// .sum-empty fica de fora: só existe com o checkout vazio (lido à parte).
const SELETORES_TIPO_SMALL = [
  '.step-label', '.step-circle',
  '.mini-row-price', '.mini-row-disc', '.cycle-toggle .left',
  '.opt-desc', '.opt-price-note', '.domain-tld', '.domain-at',
  '.field label', '.field-hint', '.field-error', '.doc-type-btn', '.terms-check',
  '.payment-desc', '.pix-box-title', '.pix-box--sm .pix-box-title', '.pix-box-desc', '.pix-copy-label', '.pix-note', '.pix-copy', '.pix-timer', '.pix-status', '.asaas-notice',
  '.access-label', '.access-value', '.access-item', '.success-help',
  '.alert-box', '.btn-back-row',
  '.summary-plan-cycle', '.sum-lines', '.sum-disc', '.summary-feature', '.secure-badge', '.summary-total .period',
];
// Seletores cujo font-size deve ser var(--cit-text-body).
const SELETORES_TIPO_BODY = [
  '.mini-row-name', '.mini-qty-val', '.mini-row-sub',
  '.opt-name',
  '.field input', '.field select', '.installments-select',
];
// Passo 3 (add-ons): só font-size nesta história; revisar na CIT-21 (sanfona), que reestrutura o passo.
const SELETORES_TIPO_SMALL_PASSO3 = [
  '.addon-desc', '.addon-price', '.addon-period', '.sky-opts-title', '.sky-opt-name', '.sky-opt-price', '.sky-qty-label', '.addon-sub-line', '.addons-subtotal-head',
];
const SELETORES_TIPO_BODY_PASSO3 = ['.addon-name', '.addon-sub-val'];
// Exceções documentadas: alertas com explicação longa usam o corpo de leitura (16px), ver checkout.html.
const EXCECOES_TIPO_BODY = ['#domainExistPanel .alert-box', '.boleto-inner .alert-box'];

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

test.describe('checkout — CIT-19', { tag: '@CIT-19' }, () => {
  // ViaCEP mockado em todos os testes da CIT-19 (sem rede externa).
  test.beforeEach(async ({ page }) => {
    await page.route('https://viacep.com.br/**', route => route.abort());
  });

  test.describe('checkout — barra de etapas', () => {
    for (const largura of LARGURAS_BARRA) {
      test(`largura ${largura}px: sem transbordo e rótulos corretos nos passos 1, 5 e 6`, async ({ page, erros }) => {
        await page.goto('checkout.html?qty5=2');
        await page.evaluate(() => document.fonts.ready);
        await page.setViewportSize({ width: largura, height: 800 });

        const rotulosEsperados = ROTULOS_POR_LARGURA[largura];
        const circuloEsperado = CIRCULO_POR_LARGURA[largura] ?? 36;

        for (const passo of [1, 5, 6]) {
          const m = await medirBarra(page, passo);
          const contexto = `largura ${largura}px, passo ${passo} (coluna ${Math.round(m.mcWidth)}px)`;

          expect(m.docOverflow, `${contexto}: documento com rolagem horizontal`).toBeLessThanOrEqual(0);
          expect(m.barOverflow, `${contexto}: #stepsBar transborda`).toBeLessThanOrEqual(0);
          if (m.duasColunas) {
            expect(m.barRight, `${contexto}: barra invade o resumo`).toBeLessThanOrEqual(m.sumLeft + 0.5);
          }
          expect(m.ativoVisivel, `${contexto}: rótulo ativo não está visível`).toBe(true);
          expect(m.ativoCortado, `${contexto}: rótulo ativo está cortado`).toBe(false);
          expect(m.labelsCortados, `${contexto}: rótulos cortados ou fora da .main-col`).toEqual([]);
          expect(m.nLabels, `${contexto}: quantidade de rótulos visíveis`).toBe(rotulosEsperados);
          expect(m.circulos, `${contexto}: tamanho dos círculos`).toEqual(Array(6).fill({ w: circuloEsperado, h: circuloEsperado }));
        }
      });
    }
  });

  test.describe('checkout — layout responsivo', () => {
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
      test(`largura ${largura}px: sem rolagem horizontal nem card transbordando em nenhum passo com dados pesados`, async ({ page, erros }) => {
        await page.goto('checkout.html?qty5=2');
        await page.evaluate(() => document.fonts.ready);
        await preencherCheckoutPesado(page);
        await page.setViewportSize({ width: largura, height: 900 });

        const variantes = /** @type {[number, string?][]} */ ([[1], [2], [3], [4], [5, 'pix'], [5, 'boleto'], [5, 'card'], [6]]);
        for (const [passo, pagamento] of variantes) {
          const m = await page.evaluate(([n, pay]) => {
            goStep(n);
            if (pay) selectPayment(pay);
            const doc = document.documentElement;
            const cards = [...document.querySelectorAll('.card')].filter(c => c.getClientRects().length > 0);
            return {
              docOverflow: doc.scrollWidth - doc.clientWidth,
              cardsVisiveis: cards.length,
              cardsTransbordando: cards.filter(c => c.scrollWidth > c.clientWidth + 1)
                .map(c => `${c.closest('[id]')?.id}: ${c.scrollWidth}>${c.clientWidth}`),
            };
          }, [passo, pagamento]);
          const id = pagamento ? `${passo}/${pagamento}` : `${passo}`;
          expect(m.docOverflow, `largura ${largura}px, passo ${id}: rolagem horizontal do documento`).toBeLessThanOrEqual(0);
          expect(m.cardsVisiveis, `largura ${largura}px, passo ${id}: nenhum .card visível medido`).toBeGreaterThan(0);
          expect(m.cardsTransbordando, `largura ${largura}px, passo ${id}: .card com conteúdo mais largo que o card`).toEqual([]);
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

  test.describe('checkout — navegação entre passos', () => {
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

  test.describe('checkout — resumo sticky', () => {
    for (const pagina of ['no topo', 'rolada até o fim']) {
      test(`1280x720 com resumo cheio e página ${pagina}: resumo cabe na janela e rola por dentro até o último selo`, async ({ page, erros }) => {
        await page.setViewportSize({ width: 1280, height: 720 });
        await page.goto('checkout.html?qty5=2');
        await page.evaluate(() => document.fonts.ready);
        await preencherCheckoutPesado(page);

        if (pagina === 'no topo') {
          await page.evaluate(() => window.scrollTo(0, 0));
          await expect.poll(() => page.evaluate(() => window.scrollY), 'a página deveria estar no topo').toBe(0);
        } else {
          await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
          await expect.poll(() => page.evaluate(() => window.scrollY), 'a página deveria estar rolada').toBeGreaterThan(0);
        }

        const antes = await page.evaluate(() => {
          const el = document.getElementById('orderSummary');
          return {
            bottom: el.getBoundingClientRect().bottom, innerHeight: window.innerHeight,
            scrollHeight: el.scrollHeight, clientHeight: el.clientHeight, scrollY: window.scrollY,
          };
        });
        expect(antes.bottom, `página ${pagina}: fundo do resumo fora da janela`).toBeLessThanOrEqual(antes.innerHeight);
        expect(antes.scrollHeight, `página ${pagina}: resumo cheio deveria ter rolagem interna`).toBeGreaterThan(antes.clientHeight);

        const scrollYDepois = await page.evaluate(() => {
          const el = document.getElementById('orderSummary');
          el.scrollTop = el.scrollHeight;
          return window.scrollY;
        });
        await expect(page.locator('.secure-badge').last(), `página ${pagina}: último selo deveria aparecer rolando só o resumo`).toBeInViewport();
        expect(scrollYDepois, `página ${pagina}: rolar o resumo não deveria rolar a página`).toBe(antes.scrollY);
      });
    }

    test('1280x900 com pedido simples: resumo cabe sem barra de rolagem', async ({ page, erros }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto('checkout.html?qty5=2');
      await page.evaluate(() => document.fonts.ready);

      const m = await page.evaluate(() => {
        const el = document.getElementById('orderSummary');
        return { scrollHeight: el.scrollHeight, clientHeight: el.clientHeight };
      });
      expect(m.scrollHeight, 'pedido simples não deveria ter rolagem interna no resumo').toBeLessThanOrEqual(m.clientHeight);
    });

    test('resumo é alcançável por teclado e identificado como região', async ({ page, erros }) => {
      await page.goto('checkout.html');
      const resumo = page.locator('#orderSummary');
      await expect(resumo).toHaveAttribute('tabindex', '0');
      await expect(resumo).toHaveAttribute('role', 'region');
      await expect(resumo).toHaveAttribute('aria-label', 'Resumo do pedido');
    });
  });

  test.describe('checkout — tipografia', () => {
    for (const largura of [1280, 412]) {
      test(`largura ${largura}px: tamanhos de fonte batem com os tokens --cit-text-small/--cit-text-body`, async ({ page, erros }) => {
        await page.goto('checkout.html');
        await page.evaluate(() => document.fonts.ready);
        await page.setViewportSize({ width: largura, height: 900 });

        const small = await tamanhoToken(page, '--cit-text-small');
        const body = await tamanhoToken(page, '--cit-text-body');
        // Sanidade dos tokens: se mudarem, os tamanhos esperados desta história precisam ser revistos.
        expect({ small, body }, 'tokens de texto do brandbook').toEqual({ small: '14px', body: '16px' });

        // .sum-empty só existe com o checkout vazio — ler antes de preencher.
        const vazio = await lerFontes(page, ['.sum-empty']);
        await preencherCheckoutPesado(page);

        const selsSmall = [...SELETORES_TIPO_SMALL, ...SELETORES_TIPO_SMALL_PASSO3];
        const selsBody = [...SELETORES_TIPO_BODY, ...SELETORES_TIPO_BODY_PASSO3];
        const cheio = await lerFontes(page, [...selsSmall, ...selsBody, '.card-title', '.summary-total .price'], EXCECOES_TIPO_BODY);
        const lido = { ...vazio, ...cheio };

        // Esperado com a mesma quantidade de ocorrências lidas (mínimo 1: seletor sem elemento falha).
        const n = (/** @type {string} */ sel) => Math.max(lido[sel]?.length ?? 0, 1);
        /** @type {Record<string, string[]>} */
        const esperado = { '.sum-empty': Array(n('.sum-empty')).fill(small) };
        for (const sel of selsSmall) esperado[sel] = Array(n(sel)).fill(small);
        for (const sel of selsBody) esperado[sel] = Array(n(sel)).fill(body);
        for (const sel of EXCECOES_TIPO_BODY) esperado[sel] = Array(n(sel)).fill(body);
        esperado['.card-title'] = Array(n('.card-title')).fill('20px');
        // Guarda de regressão: o preço total do resumo não muda nesta história.
        esperado['.summary-total .price'] = Array(n('.summary-total .price')).fill('25.6px');

        expect(lido, `largura ${largura}px: font-size por seletor (todas as ocorrências)`).toEqual(esperado);
      });
    }
  });
});

// CIT-21: add-ons do passo 3 (tabela única de preços, sanfona e aviso de desconto).

/**
 * Abre a seção de add-ons indicada no passo 3, se estiver fechada.
 * @param {import('@playwright/test').Page} page
 * @param {string} nome nome visível da seção, ex.: 'Backup'
 */
async function abrirSecao(page, nome) {
  // Sem sanfona ainda: todas as linhas de add-on estão sempre visíveis.
  void page; void nome;
}

/**
 * Digita a quantidade de um add-on no campo do passo 3 (dispara o onchange com Tab).
 * @param {import('@playwright/test').Page} page
 * @param {string} secao nome da seção que contém o add-on
 * @param {string} inputId id do campo de quantidade, ex.: 'aqTalk'
 * @param {number} qtd
 */
async function definirQtdAddon(page, secao, inputId, qtd) {
  await abrirSecao(page, secao);
  const input = page.locator(`#${inputId}`);
  await input.fill(String(qtd));
  await input.press('Tab');
}

/**
 * Textos das linhas (cada filho da linha, sem espaços extras) de um contêiner de linhas.
 * @param {import('@playwright/test').Page} page
 * @param {string} seletor seletor das linhas, ex.: '#sumAccountLines .sum-line'
 */
async function linhas(page, seletor) {
  return page.evaluate(sel => [...document.querySelectorAll(sel)]
    .map(l => [...l.children].map(s => s.textContent.replace(/\s+/g, ' ').trim())), seletor);
}

test.describe('checkout — add-ons: preços (não regressão)', { tag: '@CIT-21' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.route('https://viacep.com.br/**', route => route.abort());
  });

  test('preços exibidos em cada add-on do passo 3', async ({ page, erros }) => {
    await page.goto('checkout.html?qty5=2');
    await page.evaluate(() => goStep(3));

    const precos = await page.evaluate(() => Object.fromEntries(
      ['#adTalk .addon-price', '#adBackup90 .addon-price', '#adBackup365 .addon-price', '#adGrupo .addon-price', '#adExtraDom .addon-price',
        '#skyOpt50 .sky-opt-price', '#skyOpt100 .sky-opt-price', '#skyOpt1tb .sky-opt-price']
        .map(sel => [sel, document.querySelector(sel)?.textContent.trim()])));
    expect(precos).toEqual({
      '#adTalk .addon-price': 'R$ 4,70/conta/mês',
      '#adBackup90 .addon-price': 'R$ 6,00/conta/mês',
      '#adBackup365 .addon-price': 'R$ 19,00/conta/mês',
      '#adGrupo .addon-price': 'R$ 2,00/conta/mês',
      '#adExtraDom .addon-price': 'R$ 79,00/domínio/ano',
      '#skyOpt50 .sky-opt-price': 'R$ 17,70/conta/mês',
      '#skyOpt100 .sky-opt-price': 'R$ 28,70/conta/mês',
      '#skyOpt1tb .sky-opt-price': 'R$ 319,00/conta/mês',
    });
  });

  test('mensal: subtotais por linha, painel de selecionados, resumo e total com todos os add-ons', async ({ page, erros }) => {
    await page.goto('checkout.html?qty5=2');
    await page.evaluate(() => goStep(3));

    await definirQtdAddon(page, 'Talk – Videoconferência', 'aqTalk', 3);
    await definirQtdAddon(page, 'Backup', 'aqBackup90', 2);
    await definirQtdAddon(page, 'Backup', 'aqBackup365', 1);
    await definirQtdAddon(page, 'Armazenamento em nuvem', 'aqSkybox', 2);
    await page.locator('#skyOpt100').click();
    await definirQtdAddon(page, 'Domínio secundário', 'aqExtraDom', 2);
    const grupo = page.locator('#aqGrupo');
    await grupo.fill('4');
    await grupo.press('Tab');

    await expect(page.locator('#asTalk')).toHaveText('R$ 14,10');
    await expect(page.locator('#asBackup90')).toHaveText('R$ 12,00');
    await expect(page.locator('#asBackup365')).toHaveText('R$ 19,00');
    await expect(page.locator('#asGrupo')).toHaveText('R$ 8,00');
    await expect(page.locator('#asSkybox')).toHaveText('R$ 57,40');
    await expect(page.locator('#asExtraDom')).toHaveText('R$ 158,00');
    await expect(page.locator('#extraDomPixTotal')).toHaveText('R$ 158,00');

    // Domínio extra (anual, via Pix) fica fora do subtotal mensal dos add-ons.
    await expect(page.locator('#addonsSubtotalVal')).toHaveText('+ R$ 110,50/mês');
    expect(await linhas(page, '#addonsSubtotalLines .addon-sub-line')).toEqual([
      ['Talk', 'R$ 14,10/mês'],
      ['Backup 90d', 'R$ 12,00/mês'],
      ['Backup 365d', 'R$ 19,00/mês'],
      ['Grupo E-mail', 'R$ 8,00/mês'],
      ['Skybox 100GB', 'R$ 57,40/mês'],
    ]);

    expect(await linhas(page, '#sumAccountLines .sum-line')).toEqual([
      ['2× E-mail 5 GB', 'R$ 20,00'],
      ['Talk ×3', 'R$ 14,10'],
      ['Backup 90d ×2', 'R$ 12,00'],
      ['Backup 365d ×1', 'R$ 19,00'],
      ['Grupo E-mail ×4', 'R$ 8,00'],
      ['Skybox 100GB ×2', 'R$ 57,40'],
    ]);
    await expect(page.locator('#sumTotal')).toHaveText('R$ 130,50');
    await expect(page.locator('#sumPeriod')).toHaveText('/mês');
  });

  test('anual: total mensal com add-ons e valor anual (total × 12)', async ({ page, erros }) => {
    await page.goto('checkout.html?qty5=2&cycle=annual');
    await page.evaluate(() => goStep(3));

    await definirQtdAddon(page, 'Talk – Videoconferência', 'aqTalk', 1);
    await definirQtdAddon(page, 'Backup', 'aqBackup365', 2);
    await definirQtdAddon(page, 'Armazenamento em nuvem', 'aqSkybox', 1);
    await page.locator('#skyOpt50').click();

    // 2 × 8,00 (−20% anual) + 4,70 + 2 × 19,00 + 17,70 = 76,40
    await expect(page.locator('#sumTotal')).toHaveText('R$ 76,40');
    await expect(page.locator('#sumPeriod')).toHaveText('/mês · R$ 916,80/ano');
    await expect(page.locator('#addonsSubtotalVal')).toHaveText('+ R$ 60,40/mês');
    expect(await linhas(page, '#sumAccountLines .sum-line')).toEqual([
      ['2× E-mail 5 GB', 'R$ 16,00'],
      ['Talk ×1', 'R$ 4,70'],
      ['Backup 365d ×2', 'R$ 38,00'],
      ['Skybox 50GB ×1', 'R$ 17,70'],
    ]);
  });

  test('Skybox 1 TB: preço por licença no subtotal, no painel e no resumo', async ({ page, erros }) => {
    await page.goto('checkout.html?qty5=2');
    await page.evaluate(() => goStep(3));

    await abrirSecao(page, 'Armazenamento em nuvem');
    await page.locator('#skyOpt1tb').click();
    await definirQtdAddon(page, 'Armazenamento em nuvem', 'aqSkybox', 3);

    await expect(page.locator('#asSkybox')).toHaveText('R$ 957,00');
    await expect(page.locator('#addonsSubtotalVal')).toHaveText('+ R$ 957,00/mês');
    expect(await linhas(page, '#addonsSubtotalLines .addon-sub-line')).toEqual([['Skybox 1TB', 'R$ 957,00/mês']]);
    expect(await linhas(page, '#sumAccountLines .sum-line')).toEqual([
      ['2× E-mail 5 GB', 'R$ 20,00'],
      ['Skybox 1TB ×3', 'R$ 957,00'],
    ]);
    await expect(page.locator('#sumTotal')).toHaveText('R$ 977,00');
  });

  test('Skybox com quantidade e sem plano: R$ 0,00 e sem linha no painel nem no resumo', async ({ page, erros }) => {
    await page.goto('checkout.html?qty5=2');
    await page.evaluate(() => goStep(3));

    await definirQtdAddon(page, 'Armazenamento em nuvem', 'aqSkybox', 5);

    await expect(page.locator('#asSkybox')).toHaveText('R$ 0,00');
    await expect(page.locator('#addonsSubtotal')).toBeHidden();
    expect(await linhas(page, '#sumAccountLines .sum-line')).toEqual([['2× E-mail 5 GB', 'R$ 20,00']]);
    await expect(page.locator('#sumTotal')).toHaveText('R$ 20,00');
  });

  test('domínio extra: 2 × R$ 79,00 no Pix anual, fora do total mensal e do resumo', async ({ page, erros }) => {
    await page.goto('checkout.html?qty5=2');
    await page.evaluate(() => goStep(3));

    await definirQtdAddon(page, 'Domínio secundário', 'aqExtraDom', 2);

    await expect(page.locator('#asExtraDom')).toHaveText('R$ 158,00');
    await expect(page.locator('#extraDomPixPanel')).toBeVisible();
    await expect(page.locator('#extraDomPixTotal')).toHaveText('R$ 158,00');
    await expect(page.locator('#addonsSubtotal')).toBeHidden();
    expect(await linhas(page, '#sumAccountLines .sum-line')).toEqual([['2× E-mail 5 GB', 'R$ 20,00']]);
    await expect(page.locator('#sumTotal')).toHaveText('R$ 20,00');
  });
});
