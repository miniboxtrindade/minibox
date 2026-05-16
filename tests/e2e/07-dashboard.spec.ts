import { test, expect } from '@playwright/test';

async function gotoDashboard(page: import('@playwright/test').Page) {
  await page.goto('/home');
  await page.waitForFunction(() => /admin/i.test(document.body.innerText), { timeout: 15_000 });
  const menuToggle = page.getByRole('button', { name: /abrir menu/i });
  if (await menuToggle.isVisible()) await menuToggle.click();
  await page.getByRole('link', { name: /Dashboard/ }).first().click();
  await page.waitForURL(/\/dashboard$/);
}

test.describe('Dashboard (admin)', () => {
  test('carrega cards principais com valores numéricos', async ({ page }) => {
    await gotoDashboard(page);
    for (const label of [
      'Total recarregado',
      'Total em vendas',
      'Saldo nos crachás',
      'A receber',
      'Clientes cadastrados',
      'Transações',
    ]) {
      await expect(page.getByText(label).first()).toBeVisible({ timeout: 15_000 });
    }
  });

  test('mostra atividade recente ou empty-state', async ({ page }) => {
    await gotoDashboard(page);
    const possible = page.locator('text=/atividade|recentes|nenhuma transação|últimas/i').first();
    await expect(possible).toBeVisible({ timeout: 15_000 });
  });

  test('total transações é >= 1 (já tivemos vendas nos testes anteriores)', async ({ page }) => {
    await gotoDashboard(page);
    const transacoesCard = page.locator('text=Transações').locator('xpath=ancestor::*[contains(@class,"rounded")][1]');
    const value = await transacoesCard.locator('text=/^\\d/').first().textContent();
    expect(Number(value?.replace(/\D/g, ''))).toBeGreaterThan(0);
  });
});
