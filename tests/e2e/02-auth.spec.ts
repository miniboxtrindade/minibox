import { test, expect } from '@playwright/test';

test.describe('Auth (logado como admin)', () => {
  test('home mostra navbar com itens admin', async ({ page }) => {
    await page.goto('/home');
    await expect(page.getByRole('heading', { name: /nova venda/i })).toBeVisible();
    // Em desktop os links da navbar ficam visíveis; em mobile precisamos abrir o menu
    const menuToggle = page.getByRole('button', { name: /abrir menu/i });
    if (await menuToggle.isVisible()) {
      await menuToggle.click();
    }
    await expect(page.getByRole('link', { name: /^Home$/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Dashboard/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Usuários/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Catálogo/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /Produtos/ })).toBeVisible();
  });

  test('navegação entre rotas funciona', async ({ page }) => {
    await page.goto('/home');
    const menuToggle = page.getByRole('button', { name: /abrir menu/i });
    const openMenu = async () => {
      if (await menuToggle.isVisible()) await menuToggle.click();
    };

    await openMenu();
    await page.getByRole('link', { name: /Cliente/ }).first().click();
    await expect(page).toHaveURL(/\/cliente$/);
    await expect(page.getByRole('heading', { name: /^Cliente$/ })).toBeVisible();

    await openMenu();
    await page.getByRole('link', { name: /Catálogo/ }).first().click();
    await expect(page).toHaveURL(/\/catalog$/);

    await openMenu();
    await page.getByRole('link', { name: /Produtos/ }).first().click();
    await expect(page).toHaveURL(/\/product$/);

    await openMenu();
    await page.getByRole('link', { name: /Dashboard/ }).first().click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('logout volta para /login', async ({ page }) => {
    await page.goto('/home');
    const menuToggle = page.getByRole('button', { name: /abrir menu/i });
    if (await menuToggle.isVisible()) await menuToggle.click();
    await page.getByRole('button', { name: /^Sair$/ }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
