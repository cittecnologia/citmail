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
