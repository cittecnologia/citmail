// @ts-check
import { test, expect } from '@playwright/test';

const paginas = ['/index.html', '/login.html', '/checkout.html', '/painel.html'];

for (const pagina of paginas) {
  test(`${pagina} carrega sem erros de console nem recursos quebrados`, async ({ page }) => {
    const erros = [];
    // falhas de rede entram via requestfailed (com URL); o console só repete "Failed to load resource"
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource')) erros.push(msg.text());
    });
    page.on('pageerror', err => erros.push(err.message));
    page.on('requestfailed', req => erros.push(`${req.failure()?.errorText} ${req.url()}`));
    page.on('response', res => { if (res.status() >= 400) erros.push(`${res.status()} ${res.url()}`); });

    await page.goto(pagina);
    await expect(page).toHaveTitle(/.+/);
    expect(erros).toEqual([]);
  });
}
