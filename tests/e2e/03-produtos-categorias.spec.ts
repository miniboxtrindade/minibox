import { test, expect } from '@playwright/test';
import { RUN_ID, TAG, tagged } from './helpers';

const CAT_LABEL = `T-${RUN_ID}`;
const CAT_EMOJI = '🧪';
const PROD_NAME = tagged('Produto');
const PROD_PRICE = '3.50';
const PROD_QTY = '25';

test.describe.serial('Produtos e Categorias (admin)', () => {
  test('cria categoria nova', async ({ page }) => {
    await page.goto('/product');
    await expect(page.getByRole('heading', { name: /^Produtos$/ })).toBeVisible();

    await page.getByRole('button', { name: /criar nova categoria/i }).click();

    await page.getByRole('textbox', { name: /^Emoji$/ }).fill(CAT_EMOJI);
    await page.getByRole('textbox', { name: /nome da categoria/i }).fill(CAT_LABEL);
    await page.getByRole('button', { name: /^Criar$/ }).click();

    await expect(
      page.locator('[role="status"], [role="alert"]').filter({ hasText: /criada/i })
    ).toBeVisible({ timeout: 10_000 });

    // A categoria recém criada aparece na grade (busca por label, sem emoji)
    await expect(page.getByRole('button', { name: new RegExp(CAT_LABEL) })).toBeVisible({ timeout: 15_000 });
  });

  test('cria produto com a categoria nova', async ({ page }) => {
    await page.goto('/product');
    // Seleciona a categoria criada (busca por label)
    await page.getByRole('button', { name: new RegExp(CAT_LABEL) }).first().click();

    await page.getByRole('textbox', { name: /^Nome$/ }).fill(PROD_NAME);
    await page.getByRole('spinbutton', { name: /preço/i }).fill(PROD_PRICE);
    await page.getByRole('spinbutton', { name: /estoque/i }).fill(PROD_QTY);

    await page.getByRole('button', { name: /adicionar produto/i }).click();

    await expect(
      page.locator('[role="status"], [role="alert"]').filter({ hasText: /adicionado/i })
    ).toBeVisible({ timeout: 10_000 });

    // Produto aparece na lista
    await expect(page.getByText(PROD_NAME, { exact: false }).first()).toBeVisible();
  });

  test('produto aparece no catálogo (admin/caixa view)', async ({ page }) => {
    await page.goto('/catalog');
    await expect(page.getByText(PROD_NAME, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('produto aparece no home para venda', async ({ page }) => {
    await page.goto('/home');
    // Pode haver paginação/filtro; usa busca
    await page.getByRole('textbox', { name: /buscar produto/i }).fill(PROD_NAME.slice(0, 12));
    await expect(page.getByText(PROD_NAME, { exact: false }).first()).toBeVisible({ timeout: 10_000 });
  });

  test('edita produto: atualiza preço e estoque', async ({ page }) => {
    await page.goto('/product');
    const card = page.getByText(PROD_NAME, { exact: false }).first().locator('xpath=ancestor::*[contains(@class,"p-3")][1]');
    await card.getByRole('button', { name: /^Editar$/ }).click();

    const dialog = page.getByRole('dialog');
    await dialog.getByRole('spinbutton', { name: /preço/i }).fill('4.20');
    await dialog.getByRole('spinbutton', { name: /estoque/i }).fill('30');

    await dialog.getByRole('button', { name: /salvar alterações/i }).click();

    await expect(
      page.locator('[role="status"], [role="alert"]').filter({ hasText: /atualizado/i })
    ).toBeVisible({ timeout: 10_000 });

    // Preço atualizado aparece na lista (toFixed → ponto)
    await expect(page.getByText(/R\$ 4[.,]20/).first()).toBeVisible({ timeout: 10_000 });
  });

  test('rejeita produto com nome vazio', async ({ page }) => {
    await page.goto('/product');
    await page.getByRole('spinbutton', { name: /preço/i }).fill('1.00');
    await page.getByRole('spinbutton', { name: /estoque/i }).fill('1');
    await page.getByRole('button', { name: /adicionar produto/i }).click();
    await expect(
      page.locator('[role="status"], [role="alert"]').filter({ hasText: /preencha/i })
    ).toBeVisible({ timeout: 10_000 });
  });
});
