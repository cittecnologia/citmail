// @ts-check
import { test as base, expect } from '@playwright/test';

/**
 * Fixture `erros`: coleta erros de JS, falhas de requisição e respostas 4xx/5xx
 * da própria origem durante o teste e falha no teardown se houver algum.
 * Recursos de terceiros (Google Fonts, ViaCEP) ficam de fora para os testes não dependerem de rede externa;
 * APIs externas usadas em fluxos devem ser mockadas com page.route.
 */
export const test = base.extend({
  erros: async ({ page, baseURL }, use) => {
    const origem = new URL(/** @type {string} */ (baseURL)).origin;
    const propria = url => new URL(url).origin === origem;
    const erros = [];

    // falhas de rede entram via requestfailed/response (com URL); o console só repete "Failed to load resource"
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource')) erros.push(msg.text());
    });
    page.on('pageerror', err => erros.push(err.message));
    page.on('requestfailed', req => { if (propria(req.url())) erros.push(`${req.failure()?.errorText} ${req.url()}`); });
    page.on('response', res => { if (propria(res.url()) && res.status() >= 400) erros.push(`${res.status()} ${res.url()}`); });

    await use(erros);
    expect(erros, 'erros de console/rede durante o teste').toEqual([]);
  },
});

export { expect };
