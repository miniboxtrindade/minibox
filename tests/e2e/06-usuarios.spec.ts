import { test, expect } from '@playwright/test';

async function gotoAdminPage(page: import('@playwright/test').Page, path: string, linkName: RegExp) {
  // PrivateRoute redireciona se page.goto direto for usado antes de profile carregar.
  await page.goto('/home');
  await page.waitForFunction(() => /admin/i.test(document.body.innerText), { timeout: 15_000 });
  // Abre menu mobile se necessário e clica via NavLink (SPA nav)
  const menuToggle = page.getByRole('button', { name: /abrir menu/i });
  if (await menuToggle.isVisible()) await menuToggle.click();
  await page.getByRole('link', { name: linkName }).first().click();
  await page.waitForURL(new RegExp(path + '$'));
}

test.describe('Usuários (admin)', () => {
  test('página /usuarios carrega e lista o admin atual', async ({ page }) => {
    await gotoAdminPage(page, '/usuarios', /Usuários/);
    await expect(page.getByRole('heading', { name: /^Usuários$/ })).toBeVisible();
    await expect(page.getByText(/^você$/i).first()).toBeVisible({ timeout: 10_000 });
    // Badge "Admin" pode ter espaço por causa do ícone
    await expect(page.locator('text=/^\\s*Admin\\s*$/').first()).toBeVisible();
  });

  test('o próprio usuário não pode ser rebaixado nem excluído', async ({ page }) => {
    await gotoAdminPage(page, '/usuarios', /Usuários/);
    const selfCard = page.locator('text=você').locator('xpath=ancestor::*[contains(@class,"rounded")][1]');
    const rebaixar = selfCard.getByRole('button', { name: /Rebaixar/ });
    if (await rebaixar.count()) {
      await expect(rebaixar).toBeDisabled();
    }
    await expect(selfCard.getByRole('button', { name: /Excluir/ })).toBeDisabled();
  });

  test('botão "Resetar senha" existe para o usuário atual', async ({ page }) => {
    await gotoAdminPage(page, '/usuarios', /Usuários/);
    const selfCard = page.locator('text=você').locator('xpath=ancestor::*[contains(@class,"rounded")][1]');
    await expect(selfCard.getByRole('button', { name: /Resetar senha/i })).toBeVisible();
  });
});
