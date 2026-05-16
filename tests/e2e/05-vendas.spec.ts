import { test, expect } from '@playwright/test';
import { RUN_ID, tagged, nextClientCode } from './helpers';

const CLIENT_CODE = nextClientCode();
const CLIENT_NAME = tagged('Comprador');
const PROD_NAME = tagged('Venda Produto');
const PROD_PRICE = 2.0;
const PROD_QTY = 10;

test.describe.configure({ retries: 0 });

test.describe.serial('Vendas / Carrinho (admin)', () => {
  test('setup: cria cliente + produto para a venda', async ({ page }) => {
    // cliente
    await page.goto('/cliente');
    const card = page.locator('text=Cadastrar novo cliente').locator('xpath=ancestor::*[contains(@class,"rounded")][1]');
    await card.getByPlaceholder(/^Código$/).fill(String(CLIENT_CODE));
    await card.getByPlaceholder(/nome completo/i).fill(CLIENT_NAME);
    await card.getByRole('button', { name: /^Cadastrar$/ }).click();
    await expect(
      page.locator('[role="status"], [role="alert"]').filter({ hasText: /cadastrado/i })
    ).toBeVisible({ timeout: 10_000 });

    // recarga R$ 50
    await page.getByPlaceholder(/código do crachá/i).fill(String(CLIENT_CODE));
    await page.getByRole('button', { name: /^Buscar$/ }).click();
    await expect(page.getByText(CLIENT_NAME)).toBeVisible();
    await page.getByRole('button', { name: /^R\$ 50$/ }).click();
    await page.getByRole('button', { name: /Recarregar/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: /^Recarregar$/ }).click();
    await expect(
      page.locator('[role="status"], [role="alert"]').filter({ hasText: /recarregado/i })
    ).toBeVisible({ timeout: 10_000 });
    // confirma saldo recarregando a busca para evitar dependência de realtime
    await page.reload();
    await page.getByPlaceholder(/código do crachá/i).fill(String(CLIENT_CODE));
    await page.getByRole('button', { name: /^Buscar$/ }).click();
    await expect(page.getByText(/R\$ 50[.,]00/).first()).toBeVisible({ timeout: 15_000 });

    // produto
    await page.goto('/product');
    await page.getByRole('textbox', { name: /^Nome$/ }).fill(PROD_NAME);
    await page.getByRole('spinbutton', { name: /preço/i }).fill(String(PROD_PRICE));
    await page.getByRole('spinbutton', { name: /estoque/i }).fill(String(PROD_QTY));
    await page.getByRole('button', { name: /adicionar produto/i }).click();
    await expect(
      page.locator('[role="status"], [role="alert"]').filter({ hasText: /adicionado/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('faz uma venda com 3 unidades e valida saldo + estoque', async ({ page }) => {
    await page.goto('/home');
    await page.getByPlaceholder(/código do cliente/i).fill(String(CLIENT_CODE));
    await page.getByRole('button', { name: /^Buscar$/ }).click();
    await expect(page.getByText(CLIENT_NAME)).toBeVisible();

    // Busca produto e adiciona 3x
    await page.getByRole('textbox', { name: /buscar produto/i }).fill(PROD_NAME.slice(0, 14));
    // Card do produto: sobe até o card que contém o botão Adicionar
    const productCard = page
      .getByText(PROD_NAME, { exact: false })
      .locator('xpath=ancestor::*[contains(@class,"p-3")][1]');
    await expect(productCard).toBeVisible({ timeout: 10_000 });

    const addBtn = productCard.getByRole('button', { name: /^Adicionar$/ });
    await addBtn.click();
    await addBtn.click();
    await addBtn.click();

    // Abre carrinho
    await page.getByRole('button', { name: /abrir carrinho/i }).click();
    // Total: 3 * 2.00
    await expect(page.getByText(/R\$ 6[.,]00/).first()).toBeVisible();

    await page.getByRole('button', { name: /finalizar venda/i }).click();
    // Modal confirma
    await page.getByRole('dialog').getByRole('button', { name: /^Finalizar$/ }).click();

    // Tela de sucesso
    await expect(page.getByRole('heading', { name: /venda concluída/i })).toBeVisible({ timeout: 15_000 });
    // Novo saldo = 50 - 6 = 44
    await expect(page.getByText(/R\$ 44[.,]00/).first()).toBeVisible();

    await page.getByRole('button', { name: /^Concluir$/ }).click();
  });

  test('estoque foi decrementado de 10 para 7', async ({ page }) => {
    await page.goto('/product');
    await expect(page.getByRole('heading', { name: /Cadastrados/ })).toBeVisible({ timeout: 15_000 });
    // Encontra o <li> que contém o produto e procura o badge de estoque dentro dele
    const item = page.getByRole('listitem').filter({ hasText: PROD_NAME });
    await expect(item).toBeVisible({ timeout: 15_000 });
    await expect(item.getByText(/7 em estoque|7 restantes/i)).toBeVisible({ timeout: 15_000 });
  });

  test('carrinho não permite passar do estoque', async ({ page }) => {
    await page.goto('/home');
    await page.getByPlaceholder(/código do cliente/i).fill(String(CLIENT_CODE));
    await page.getByRole('button', { name: /^Buscar$/ }).click();

    await page.getByRole('textbox', { name: /buscar produto/i }).fill(PROD_NAME.slice(0, 14));
    const card = page
      .getByText(PROD_NAME, { exact: false })
      .locator('xpath=ancestor::*[contains(@class,"p-3")][1]');
    const addBtn = card.getByRole('button', { name: /^Adicionar$/ });

    // clica 8 vezes (estoque é 7) — a 8a deve alertar
    for (let i = 0; i < 8; i++) {
      await addBtn.click({ delay: 50 });
    }
    await expect(
      page.locator('[role="status"], [role="alert"]').filter({ hasText: /quantidade máxima em estoque/i })
    ).toBeVisible({ timeout: 10_000 });
  });
});
