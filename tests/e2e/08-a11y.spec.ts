import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  { path: '/home', name: 'home', linkName: /^Home$/ },
  { path: '/cliente', name: 'cliente', linkName: /^Cliente$/ },
  { path: '/catalog', name: 'catalog', linkName: /^Catálogo$/ },
  { path: '/product', name: 'product', linkName: /^Produtos$/ },
  { path: '/dashboard', name: 'dashboard', linkName: /^Dashboard$/ },
  { path: '/usuarios', name: 'usuarios', linkName: /^Usuários$/ },
];

async function navigate(page: import('@playwright/test').Page, path: string, linkName: RegExp) {
  await page.goto('/home');
  await page.waitForFunction(() => /admin/i.test(document.body.innerText), { timeout: 15_000 });
  if (path === '/home') return;
  const menuToggle = page.getByRole('button', { name: /abrir menu/i });
  if (await menuToggle.isVisible()) await menuToggle.click();
  await page.getByRole('link', { name: linkName }).first().click();
  await page.waitForURL(new RegExp(path + '$'));
}

for (const p of PAGES) {
  test(`a11y: ${p.name} sem violações sérias`, async ({ page }) => {
    await navigate(page, p.path, p.linkName);
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});

    const results = await new AxeBuilder({ page })
      // color-contrast: requer revisão do design system
      .disableRules(['color-contrast'])
      .analyze();

    const serious = results.violations.filter(
      (v) => v.impact === 'serious' || v.impact === 'critical',
    );
    if (serious.length) {
      console.log(`A11y serious/critical em ${p.path}:`, JSON.stringify(serious.map(v => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length })), null, 2));
    }
    expect(serious, `Violações sérias em ${p.path}`).toEqual([]);
  });
}
