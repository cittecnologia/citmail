// @ts-check
import { test, expect } from './fixtures.js';

const paginas = [
  { arquivo: 'index.html', titulo: 'CITMail — E-mail corporativo com domínio próprio' },
  { arquivo: 'login.html', titulo: 'Entrar — CITMail' },
  { arquivo: 'checkout.html', titulo: 'Contratar Plano — CITMail' },
  { arquivo: 'painel.html', titulo: 'Painel do Cliente — CITMail' },
];

for (const { arquivo, titulo } of paginas) {
  test(`${arquivo} carrega sem erros e com todos os ícones do sprite`, { tag: '@CIT-12' }, async ({ page, erros }) => {
    await page.goto(arquivo, { waitUntil: 'networkidle' });

    // garante que é a página pedida (e não um fallback)
    await expect(page).toHaveURL(new RegExp(`/citmail/${arquivo.replace('.', '\\.')}$`));
    await expect(page).toHaveTitle(titulo);

    // todo <use href="...icons.svg#id"> precisa apontar para um símbolo existente no sprite
    const ausentes = await page.evaluate(async () => {
      const usos = [...document.querySelectorAll('use')]
        .map(u => u.getAttribute('href') || u.getAttribute('xlink:href') || '')
        .filter(href => href.includes('icons.svg#'));
      if (!usos.length) return [];
      const resposta = await fetch(new URL(usos[0].split('#')[0], location.href));
      if (!resposta.ok) return [`sprite ${resposta.status}`];
      const sprite = new DOMParser().parseFromString(await resposta.text(), 'image/svg+xml');
      const ids = new Set([...sprite.querySelectorAll('[id]')].map(el => el.id));
      return [...new Set(usos.map(href => href.split('#')[1]))].filter(id => !ids.has(id));
    });
    expect(ausentes, 'ícones referenciados que não existem no sprite').toEqual([]);
  });
}
