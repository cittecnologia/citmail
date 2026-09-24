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
// Passo 3 (add-ons), incluindo o cabeçalho das seções da sanfona, o indicador de subtotal e o aviso de desconto (CIT-21).
const SELETORES_TIPO_SMALL_PASSO3 = [
  '.addon-desc', '.addon-price', '.addon-period', '.sky-opts-title', '.sky-opt-name', '.sky-opt-price', '.sky-qty-label', '.addon-sub-line', '.addons-subtotal-head',
  '.addon-sec-ind', '.aviso-desconto-texto',
];
const SELETORES_TIPO_BODY_PASSO3 = ['.addon-name', '.addon-sub-val', '.addon-sec-nome', '.aviso-desconto-titulo'];
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
  const botao = botaoSecao(page, nome);
  if (await botao.getAttribute('aria-expanded') !== 'true') await botao.click();
  await expect(botao).toHaveAttribute('aria-expanded', 'true');
}

/**
 * Botão do cabeçalho de uma seção da sanfona de add-ons (nome acessível começa pelo nome da seção;
 * o indicador de subtotal, quando visível, entra depois).
 * @param {import('@playwright/test').Page} page
 * @param {string} nome
 */
function botaoSecao(page, nome) {
  const esc = nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return page.locator('#step3 .addon-sec-btn').filter({ has: page.locator('.addon-sec-nome', { hasText: new RegExp(`^${esc}$`) }) });
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

// Seções da sanfona do passo 3, na ordem da tela.
const SECOES_ADDONS = ['Armazenamento em nuvem', 'Talk – Videoconferência', 'Backup', 'Domínio secundário'];
// Nomes dos add-ons nos rótulos dos controles de quantidade (campo `nome` da tabela de preços).
const NOMES_ADDONS = ['Talk', 'Backup 90 dias', 'Backup 365 dias', 'Skybox', 'Domínio extra', 'Grupo de E-mail'];

/**
 * Estado aberto/fechado de cada seção (aria-expanded do botão), na ordem da tela.
 * @param {import('@playwright/test').Page} page
 */
async function estadoSecoes(page) {
  return page.locator('#step3 .addon-sec-btn').evaluateAll(bs => bs.map(b => b.getAttribute('aria-expanded')));
}

/**
 * Painel controlado pelo botão da seção (via aria-controls).
 * @param {import('@playwright/test').Page} page
 * @param {string} nome
 */
async function painelSecao(page, nome) {
  const id = await botaoSecao(page, nome).getAttribute('aria-controls');
  return page.locator(`#${id}`);
}

test.describe('checkout — add-ons: sanfona', { tag: '@CIT-21' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.route('https://viacep.com.br/**', route => route.abort());
  });

  test('título do passo é h2 e as seções são h3 com botão, nesta ordem e com estes nomes', async ({ page, erros }) => {
    await page.goto('checkout.html?qty5=2');
    await page.evaluate(() => goStep(3));

    await expect(page.locator('#step3').getByRole('heading', { level: 2 })).toHaveText('Add-ons e Serviços Extras');
    await expect(page.locator('#step3 h3')).toHaveText(SECOES_ADDONS);
    await expect(page.locator('#step3 h3 > button.addon-sec-btn')).toHaveCount(SECOES_ADDONS.length);

    for (const nome of SECOES_ADDONS) {
      const botao = botaoSecao(page, nome);
      await expect(botao).toHaveCount(1);
      const painel = await painelSecao(page, nome);
      await expect(painel).toHaveAttribute('role', 'region');
      await expect(painel).toHaveAttribute('aria-labelledby', await botao.getAttribute('id') ?? '');
    }
    // Conteúdo de cada seção.
    await expect((await painelSecao(page, 'Armazenamento em nuvem')).locator('#adSkybox')).toHaveCount(1);
    await expect((await painelSecao(page, 'Talk – Videoconferência')).locator('#adTalk')).toHaveCount(1);
    await expect((await painelSecao(page, 'Backup')).locator('#adBackup90, #adBackup365')).toHaveCount(2);
    await expect((await painelSecao(page, 'Domínio secundário')).locator('#adExtraDom, #extraDomPixPanel')).toHaveCount(2);
  });

  test('Grupo de E-mail fica fora das seções, sempre visível, e entra no subtotal, no resumo e no total', async ({ page, erros }) => {
    await page.goto('checkout.html?qty5=2');
    await page.evaluate(() => goStep(3));

    await expect(page.locator('.addon-sec #adGrupo')).toHaveCount(0);
    // Abaixo da última seção.
    const depois = await page.evaluate(() => {
      const secoes = document.querySelectorAll('#step3 .addon-sec');
      return !!(secoes[secoes.length - 1].compareDocumentPosition(document.getElementById('adGrupo')) & Node.DOCUMENT_POSITION_FOLLOWING);
    });
    expect(depois, '#adGrupo deveria vir depois das seções').toBe(true);

    await botaoSecao(page, 'Armazenamento em nuvem').click();
    expect(await estadoSecoes(page)).toEqual(['false', 'false', 'false', 'false']);
    await expect(page.locator('#adGrupo')).toBeVisible();

    await page.getByRole('button', { name: 'Aumentar Grupo de E-mail', exact: true }).click();
    await page.getByRole('button', { name: 'Aumentar Grupo de E-mail', exact: true }).click();
    await expect(page.locator('#asGrupo')).toHaveText('R$ 4,00');
    await expect(page.locator('#addonsSubtotalVal')).toHaveText('+ R$ 4,00/mês');
    expect(await linhas(page, '#sumAccountLines .sum-line')).toEqual([['2× E-mail 5 GB', 'R$ 20,00'], ['Grupo E-mail ×2', 'R$ 4,00']]);
    await expect(page.locator('#sumTotal')).toHaveText('R$ 24,00');
  });

  test('seções são independentes: várias abertas ao mesmo tempo', async ({ page, erros }) => {
    await page.goto('checkout.html?qty5=2');
    await page.evaluate(() => goStep(3));
    expect(await estadoSecoes(page)).toEqual(['true', 'false', 'false', 'false']);

    await botaoSecao(page, 'Talk – Videoconferência').click();
    await botaoSecao(page, 'Backup').click();
    await botaoSecao(page, 'Domínio secundário').click();
    expect(await estadoSecoes(page)).toEqual(['true', 'true', 'true', 'true']);
    for (const nome of SECOES_ADDONS) await expect(await painelSecao(page, nome)).toBeVisible();

    await botaoSecao(page, 'Backup').click();
    expect(await estadoSecoes(page)).toEqual(['true', 'true', 'false', 'true']);
    await expect(await painelSecao(page, 'Backup')).toBeHidden();
    await expect(await painelSecao(page, 'Talk – Videoconferência')).toBeVisible();
  });

  test('teclado: Enter e Espaço abrem e fecham a seção', async ({ page, erros }) => {
    await page.goto('checkout.html?qty5=2');
    await page.evaluate(() => goStep(3));
    const botao = botaoSecao(page, 'Talk – Videoconferência');
    const painel = await painelSecao(page, 'Talk – Videoconferência');

    await botao.focus();
    await page.keyboard.press('Enter');
    await expect(botao).toHaveAttribute('aria-expanded', 'true');
    await expect(painel).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(botao).toHaveAttribute('aria-expanded', 'false');
    await expect(painel).toBeHidden();

    await page.keyboard.press('Space');
    await expect(botao).toHaveAttribute('aria-expanded', 'true');
    await expect(painel).toBeVisible();
    await page.keyboard.press('Space');
    await expect(botao).toHaveAttribute('aria-expanded', 'false');
    await expect(painel).toBeHidden();
  });

  test('estado inicial: sem seleção só Armazenamento aberta', async ({ page, erros }) => {
    await page.goto('checkout.html?qty5=2');
    await page.evaluate(() => goStep(3));
    expect(await estadoSecoes(page)).toEqual(['true', 'false', 'false', 'false']);
    await expect(await painelSecao(page, 'Armazenamento em nuvem')).toBeVisible();
    for (const nome of SECOES_ADDONS.slice(1)) await expect(await painelSecao(page, nome)).toBeHidden();
  });

  test('estado inicial: seções com seleção abrem ao entrar no passo 3 e ao voltar do passo 4', async ({ page, erros }) => {
    await page.goto('checkout.html?qty5=2');
    await page.evaluate(() => goStep(3));

    await abrirSecao(page, 'Backup');
    await page.getByRole('button', { name: 'Aumentar Backup 365 dias', exact: true }).click();
    await abrirSecao(page, 'Domínio secundário');
    await page.getByRole('button', { name: 'Aumentar Domínio extra', exact: true }).click();
    // Fecha tudo antes de sair do passo.
    for (const nome of SECOES_ADDONS) {
      const b = botaoSecao(page, nome);
      if (await b.getAttribute('aria-expanded') === 'true') await b.click();
    }
    expect(await estadoSecoes(page)).toEqual(['false', 'false', 'false', 'false']);

    await page.locator('#step3 .btn-primary').click();
    await expect(page.locator('#step4')).toHaveClass(/active/);
    await page.locator('#step4 .btn-back-row').click();
    await expect(page.locator('#step3')).toHaveClass(/active/);

    // Armazenamento (padrão) + Backup e Domínio (com seleção); Talk fechada.
    expect(await estadoSecoes(page)).toEqual(['true', 'false', 'true', 'true']);
    await expect(page.getByRole('button', { name: 'Aumentar Backup 365 dias', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aumentar Talk', exact: true })).toBeHidden();

    // Entrada vinda do passo 2 (goStep) também reaplica o estado.
    await botaoSecao(page, 'Armazenamento em nuvem').click();
    await page.evaluate(() => goStep(2));
    await page.evaluate(() => goStep(3));
    expect(await estadoSecoes(page)).toEqual(['true', 'false', 'true', 'true']);
  });

  test('estado inicial: Talk com quantidade abre a seção; Skybox com plano mantém Armazenamento aberta', async ({ page, erros }) => {
    await page.goto('checkout.html?qty5=2');
    await page.evaluate(() => goStep(3));
    await page.locator('#skyOpt50').click();
    await abrirSecao(page, 'Talk – Videoconferência');
    await page.getByRole('button', { name: 'Aumentar Talk', exact: true }).click();
    await botaoSecao(page, 'Talk – Videoconferência').click();
    await botaoSecao(page, 'Armazenamento em nuvem').click();

    await page.evaluate(() => { goStep(4); goStep(3); });
    expect(await estadoSecoes(page)).toEqual(['true', 'true', 'false', 'false']);
  });

  test('entrar no passo 3 não move o foco para as seções', async ({ page, erros }) => {
    await page.goto('checkout.html?qty5=2');
    await page.evaluate(() => goStep(4));
    await page.locator('#step4 .btn-back-row').click();
    await expect(page.locator('#step3')).toHaveClass(/active/);
    const focoNaSanfona = await page.evaluate(() => !!document.activeElement?.closest('.addon-list'));
    expect(focoNaSanfona).toBe(false);
  });

  test('indicador: subtotal da seção só quando fechada e com valor', async ({ page, erros }) => {
    await page.goto('checkout.html?qty5=2');
    await page.evaluate(() => goStep(3));
    const ind = (/** @type {string} */ nome) => botaoSecao(page, nome).locator('.addon-sec-ind');

    // Sem seleção: vazio, aberta ou fechada.
    for (const nome of SECOES_ADDONS) await expect(ind(nome)).toHaveText('');

    // Talk ×3: vazio aberta, subtotal fechada (e no nome acessível do botão).
    await abrirSecao(page, 'Talk – Videoconferência');
    await page.getByRole('spinbutton', { name: 'Quantidade de Talk', exact: true }).fill('3');
    await page.getByRole('spinbutton', { name: 'Quantidade de Talk', exact: true }).press('Tab');
    await expect(ind('Talk – Videoconferência')).toHaveText('');
    await botaoSecao(page, 'Talk – Videoconferência').click();
    await expect(ind('Talk – Videoconferência')).toHaveText('R$ 14,10/mês');
    await expect(page.getByRole('button', { name: 'Talk – Videoconferência R$ 14,10/mês' })).toHaveCount(1);
    await botaoSecao(page, 'Talk – Videoconferência').click();
    await expect(ind('Talk – Videoconferência')).toHaveText('');

    // Backup: soma dos dois add-ons.
    await abrirSecao(page, 'Backup');
    await page.getByRole('button', { name: 'Aumentar Backup 90 dias', exact: true }).click();
    await page.getByRole('button', { name: 'Aumentar Backup 365 dias', exact: true }).click();
    await botaoSecao(page, 'Backup').click();
    await expect(ind('Backup')).toHaveText('R$ 25,00/mês');

    // Domínio: por ano.
    await abrirSecao(page, 'Domínio secundário');
    await page.getByRole('button', { name: 'Aumentar Domínio extra', exact: true }).click();
    await page.getByRole('button', { name: 'Aumentar Domínio extra', exact: true }).click();
    await botaoSecao(page, 'Domínio secundário').click();
    await expect(ind('Domínio secundário')).toHaveText('R$ 158,00/ano');

    // Skybox: só com plano e quantidade.
    const arm = 'Armazenamento em nuvem';
    await page.getByRole('button', { name: 'Aumentar Skybox', exact: true }).click();
    await botaoSecao(page, arm).click();
    await expect(ind(arm), 'Skybox com quantidade e sem plano').toHaveText('');
    await abrirSecao(page, arm);
    await page.getByRole('button', { name: 'Diminuir Skybox', exact: true }).click();
    await page.locator('#skyOpt100').click();
    await botaoSecao(page, arm).click();
    await expect(ind(arm), 'Skybox com plano e sem quantidade').toHaveText('');
    await abrirSecao(page, arm);
    await page.getByRole('button', { name: 'Aumentar Skybox', exact: true }).click();
    await botaoSecao(page, arm).click();
    await expect(ind(arm), 'Skybox com plano e quantidade').toHaveText('R$ 28,70/mês');

    // Indicador atualiza com a seção fechada quando o valor muda por fora (resumo segue igual).
    await page.evaluate(() => addonChange('talk', 1));
    await expect(ind('Talk – Videoconferência')).toHaveText('');
    await botaoSecao(page, 'Talk – Videoconferência').click();
    await expect(ind('Talk – Videoconferência')).toHaveText('R$ 18,80/mês');
  });

  test('controles de quantidade: nomes acessíveis únicos e campos rotulados', async ({ page, erros }) => {
    await page.goto('checkout.html?qty5=2');
    await page.evaluate(() => goStep(3));
    for (const nome of SECOES_ADDONS) await abrirSecao(page, nome);

    for (const nome of NOMES_ADDONS) {
      await expect(page.getByRole('button', { name: `Diminuir ${nome}`, exact: true }), `Diminuir ${nome}`).toHaveCount(1);
      await expect(page.getByRole('button', { name: `Aumentar ${nome}`, exact: true }), `Aumentar ${nome}`).toHaveCount(1);
      await expect(page.getByRole('spinbutton', { name: `Quantidade de ${nome}`, exact: true }), `Quantidade de ${nome}`).toHaveCount(1);
    }
    // Todos os botões − e + do passo 3 têm nome próprio (nenhum fica só com "−"/"+").
    const nomes = await page.locator('#step3 .mini-qty-btn').evaluateAll(bs => bs.map(b => b.getAttribute('aria-label')));
    expect(nomes.length).toBe(NOMES_ADDONS.length * 2);
    expect(new Set(nomes).size, 'aria-label repetido nos botões −/+').toBe(nomes.length);

    await page.getByRole('button', { name: 'Aumentar Talk', exact: true }).click();
    await expect(page.getByRole('spinbutton', { name: 'Quantidade de Talk', exact: true })).toHaveValue('1');
    await page.getByRole('button', { name: 'Diminuir Talk', exact: true }).click();
    await expect(page.getByRole('spinbutton', { name: 'Quantidade de Talk', exact: true })).toHaveValue('0');
  });

  test('painel fechado: atributo hidden e controles ocultos', async ({ page, erros }) => {
    await page.goto('checkout.html?qty5=2');
    await page.evaluate(() => goStep(3));

    const painel = await painelSecao(page, 'Backup');
    await expect(botaoSecao(page, 'Backup')).toHaveAttribute('aria-expanded', 'false');
    await expect(painel).toHaveAttribute('hidden', '');
    await expect(painel).toBeHidden();
    await expect(page.getByRole('button', { name: 'Aumentar Backup 90 dias', exact: true })).toBeHidden();
    await expect(page.locator('#aqBackup365')).toBeHidden();

    await botaoSecao(page, 'Backup').click();
    await expect(painel).not.toHaveAttribute('hidden');
    await expect(page.getByRole('button', { name: 'Aumentar Backup 90 dias', exact: true })).toBeVisible();

    await botaoSecao(page, 'Armazenamento em nuvem').click();
    await expect(page.locator('#skyOpt50')).toBeHidden();
    await expect(page.getByRole('button', { name: 'Aumentar Skybox', exact: true })).toBeHidden();
  });

  test('chevron gira 180° fechada; com movimento reduzido não há transição', async ({ page, erros }) => {
    await page.goto('checkout.html?qty5=2');
    await page.evaluate(() => goStep(3));
    const chevron = (/** @type {string} */ nome) => botaoSecao(page, nome).locator('.addon-sec-chevron');

    await expect(chevron('Armazenamento em nuvem')).toHaveCSS('transform', 'none');
    await expect(chevron('Backup')).toHaveCSS('transform', /^matrix\(-1, .*, -1, 0, 0\)$/);
    await expect(chevron('Backup')).not.toHaveCSS('transition-duration', '0s');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(chevron('Backup')).toHaveCSS('transition-duration', '0s');
    await expect(chevron('Armazenamento em nuvem')).toHaveCSS('transition-duration', '0s');
  });

  for (const largura of [320, 412, 1280]) {
    test(`largura ${largura}px: passo 3 sem transbordo com seções todas abertas e todas fechadas com indicador`, async ({ page, erros }) => {
      await page.goto('checkout.html?qty5=2');
      await page.evaluate(() => document.fonts.ready);
      await preencherCheckoutPesado(page);
      await page.setViewportSize({ width: largura, height: 900 });
      await page.evaluate(() => goStep(3));

      for (const estado of ['abertas', 'fechadas']) {
        for (const nome of SECOES_ADDONS) {
          const b = botaoSecao(page, nome);
          if ((await b.getAttribute('aria-expanded') === 'true') !== (estado === 'abertas')) await b.click();
        }
        expect(await estadoSecoes(page)).toEqual(Array(4).fill(estado === 'abertas' ? 'true' : 'false'));

        const m = await page.evaluate(() => {
          const doc = document.documentElement;
          const els = [...document.querySelectorAll('#step3 .addon-sec-btn, #step3 .addon-sec-painel, #step3 .addon-sec')]
            .filter(e => e.getClientRects().length > 0);
          return {
            docOverflow: doc.scrollWidth - doc.clientWidth,
            medidos: els.length,
            transbordando: els.filter(e => e.scrollWidth > e.clientWidth)
              .map(e => `${e.id || e.className}: ${e.scrollWidth}>${e.clientWidth}`),
            // Filhos do botão (nome, indicador, chevron) dentro da caixa do botão.
            foraDoBotao: [...document.querySelectorAll('#step3 .addon-sec-btn')].flatMap(b => {
              const r = b.getBoundingClientRect();
              return [...b.children].filter(c => {
                const cr = c.getBoundingClientRect();
                return cr.width > 0 && (cr.left < r.left - 0.5 || cr.right > r.right + 0.5);
              }).map(c => `${b.id} > ${c.getAttribute('class')}`);
            }),
            indicadores: [...document.querySelectorAll('#step3 .addon-sec-ind')].map(i => i.textContent),
          };
        });
        const ctx = `largura ${largura}px, seções ${estado}`;
        expect(m.docOverflow, `${ctx}: rolagem horizontal do documento`).toBeLessThanOrEqual(0);
        expect(m.medidos, `${ctx}: elementos medidos`).toBe(estado === 'abertas' ? 12 : 8);
        expect(m.transbordando, `${ctx}: botão ou painel transbordando`).toEqual([]);
        expect(m.foraDoBotao, `${ctx}: conteúdo fora do botão`).toEqual([]);
        expect(m.indicadores, `${ctx}: indicadores`).toEqual(estado === 'abertas'
          ? ['', '', '', '']
          : ['R$ 12.760,00/mês', 'R$ 188,00/mês', 'R$ 1.000,00/mês', 'R$ 3.160,00/ano']);
      }
    });
  }
});

test.describe('checkout — add-ons: aviso de desconto', { tag: '@CIT-21' }, () => {
  test.beforeEach(async ({ page }) => {
    await page.route('https://viacep.com.br/**', route => route.abort());
  });

  test('aviso visível só no passo 3, entre a introdução e as seções', async ({ page, erros }) => {
    await page.goto('checkout.html?qty5=2');
    const aviso = page.locator('#avisoDescontoAddons');
    await expect(aviso).toHaveCount(1);

    for (const passo of [1, 2, 3, 4, 5, 6]) {
      await page.evaluate(n => goStep(n), passo);
      if (passo === 3) await expect(aviso, 'passo 3').toBeVisible();
      else await expect(aviso, `passo ${passo}`).toBeHidden();
    }

    await page.evaluate(() => goStep(3));
    const ordem = await page.evaluate(() => {
      const aviso = document.getElementById('avisoDescontoAddons');
      const intro = document.querySelector('#step3 .step-intro');
      const lista = document.querySelector('#step3 .addon-list');
      const segue = (/** @type {Node} */ a, /** @type {Node} */ b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      return segue(intro, aviso) && segue(aviso, lista);
    });
    expect(ordem, 'aviso deveria ficar entre a introdução e as seções').toBe(true);
  });

  test('texto exato, em maiúsculas no HTML e sem percentual', async ({ page, erros }) => {
    await page.goto('checkout.html?qty5=2');
    await page.evaluate(() => goStep(3));
    const aviso = page.locator('#avisoDescontoAddons');

    await expect(aviso.locator('.aviso-desconto-titulo')).toHaveText('APROVEITE A OPORTUNIDADE PARA GARANTIR O DESCONTO');
    // Maiúsculas no próprio HTML, não por text-transform.
    expect(await aviso.locator('.aviso-desconto-titulo').evaluate(e => e.textContent.trim())).toBe('APROVEITE A OPORTUNIDADE PARA GARANTIR O DESCONTO');
    await expect(aviso.locator('.aviso-desconto-texto')).toHaveText('Condição exclusiva desta contratação');
    expect(await aviso.textContent()).not.toMatch(/\d+\s?%/);
  });

  test('contraste do título e do texto do aviso é de pelo menos 4,5:1', async ({ page, erros }) => {
    await page.goto('checkout.html?qty5=2');
    await page.evaluate(() => goStep(3));

    const contrastes = await page.evaluate(() => {
      const rgba = (/** @type {string} */ c) => (c.match(/[\d.]+/g) || []).map(Number);
      const lum = (/** @type {number[]} */ [r, g, b]) => {
        const f = (/** @type {number} */ v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
      };
      // Fundo efetivo: compõe os fundos dos ancestrais (com alfa) sobre branco.
      const fundo = (/** @type {Element} */ el) => {
        const camadas = [];
        for (let e = el; e; e = e.parentElement) {
          const c = rgba(getComputedStyle(e).backgroundColor);
          const a = c.length > 3 ? c[3] : 1;
          if (a > 0) camadas.push([c[0], c[1], c[2], a]);
          if (a >= 1) break;
        }
        let cor = [255, 255, 255];
        for (const [r, g, b, a] of camadas.reverse()) cor = [r * a + cor[0] * (1 - a), g * a + cor[1] * (1 - a), b * a + cor[2] * (1 - a)];
        return cor;
      };
      const contraste = (/** @type {string} */ sel) => {
        const el = /** @type {Element} */ (document.querySelector(sel));
        const l1 = lum(rgba(getComputedStyle(el).color).slice(0, 3));
        const l2 = lum(fundo(el));
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      };
      return { titulo: contraste('#avisoDescontoAddons .aviso-desconto-titulo'), texto: contraste('#avisoDescontoAddons .aviso-desconto-texto') };
    });
    expect(contrastes.titulo, 'contraste do título').toBeGreaterThanOrEqual(4.5);
    expect(contrastes.texto, 'contraste do texto').toBeGreaterThanOrEqual(4.5);
  });
});
