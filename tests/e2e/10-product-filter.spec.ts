import { test, expect } from '@playwright/test';
import { RUN_ID, tagged } from './helpers';

// 2 categorias + 2 produtos para validar busca e filtro de forma independente.
const CAT_A_LABEL = `T-A-${RUN_ID}`;
const CAT_B_LABEL = `T-B-${RUN_ID}`;
const CAT_A_EMOJI = '🧪';
const CAT_B_EMOJI = '🧫';
const PROD_A = tagged('Alfa Filtro');
const PROD_B = tagged('Beta Filtro');

async function criarCategoria(page: import('@playwright/test').Page, emoji: string, label: string) {
  await page.goto('/product');
  // O botão "Criar nova categoria" alterna a seção; só clica se ainda não está aberta
  const novaCat = page.getByRole('button', { name: /criar nova categoria/i });
  await novaCat.click();
  await page.getByRole('textbox', { name: /^Emoji$/ }).fill(emoji);
  await page.getByRole('textbox', { name: /nome da categoria/i }).fill(label);
  await page.getByRole('button', { name: /^Criar$/ }).click();
  await expect(
    page.locator('[role="status"], [role="alert"]').filter({ hasText: /criada/i }),
  ).toBeVisible({ timeout: 10_000 });
}

async function criarProduto(
  page: import('@playwright/test').Page,
  nome: string,
  catLabel: string,
  preco: string,
  qtd: string,
) {
  await page.goto('/product');
  await page.getByRole('button', { name: new RegExp(catLabel) }).first().click();
  await page.getByRole('textbox', { name: /^Nome$/ }).fill(nome);
  await page.getByRole('spinbutton', { name: /preço/i }).fill(preco);
  await page.getByRole('spinbutton', { name: /estoque/i }).fill(qtd);
  await page.getByRole('button', { name: /adicionar produto/i }).click();
  await expect(
    page.locator('[role="status"], [role="alert"]').filter({ hasText: /adicionado/i }),
  ).toBeVisible({ timeout: 10_000 });
}

test.describe.serial('Listagem /product — busca + filtro por categoria', () => {
  test('setup: cria 2 categorias e 2 produtos', async ({ page }) => {
    await criarCategoria(page, CAT_A_EMOJI, CAT_A_LABEL);
    await criarCategoria(page, CAT_B_EMOJI, CAT_B_LABEL);
    await criarProduto(page, PROD_A, CAT_A_LABEL, '1.50', '5');
    await criarProduto(page, PROD_B, CAT_B_LABEL, '2.50', '7');
  });

  test('busca por nome filtra a lista', async ({ page }) => {
    await page.goto('/product');
    const busca = page.getByRole('textbox', { name: /buscar produto/i });
    // Usa termo único de PROD_A ("Alfa") para não bater no prefixo compartilhado
    await busca.fill('Alfa');
    await expect(page.getByText(PROD_A, { exact: false })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(PROD_B, { exact: false })).toHaveCount(0);
  });

  test('busca sem resultados mostra empty state', async ({ page }) => {
    await page.goto('/product');
    await page.getByRole('textbox', { name: /buscar produto/i }).fill('zzzz-nao-existe-xyz');
    await expect(page.getByText(/nenhum produto encontrado/i)).toBeVisible({ timeout: 10_000 });
  });

  test('filtro por categoria A mostra só produto A', async ({ page }) => {
    await page.goto('/product');
    // Os chips de filtro estão dentro de <nav aria-label="Filtrar por categoria">
    const filtros = page.getByRole('navigation', { name: /filtrar por categoria/i });
    await filtros.getByRole('button', { name: new RegExp(CAT_A_LABEL) }).click();

    await expect(page.getByText(PROD_A, { exact: false })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(PROD_B, { exact: false })).toHaveCount(0);
  });

  test('filtro por categoria B mostra só produto B', async ({ page }) => {
    await page.goto('/product');
    const filtros = page.getByRole('navigation', { name: /filtrar por categoria/i });
    await filtros.getByRole('button', { name: new RegExp(CAT_B_LABEL) }).click();

    await expect(page.getByText(PROD_B, { exact: false })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(PROD_A, { exact: false })).toHaveCount(0);
  });

  test('chip "Todos" reseta o filtro', async ({ page }) => {
    await page.goto('/product');
    const filtros = page.getByRole('navigation', { name: /filtrar por categoria/i });
    await filtros.getByRole('button', { name: new RegExp(CAT_A_LABEL) }).click();
    await expect(page.getByText(PROD_B, { exact: false })).toHaveCount(0);
    await filtros.getByRole('button', { name: /^Todos$/ }).click();
    await expect(page.getByText(PROD_A, { exact: false })).toBeVisible();
    await expect(page.getByText(PROD_B, { exact: false })).toBeVisible();
  });

  test('busca + filtro combinam: categoria B com termo de A → vazio', async ({ page }) => {
    await page.goto('/product');
    const filtros = page.getByRole('navigation', { name: /filtrar por categoria/i });
    await filtros.getByRole('button', { name: new RegExp(CAT_B_LABEL) }).click();
    await page.getByRole('textbox', { name: /buscar produto/i }).fill('Alfa');
    await expect(page.getByText(/nenhum produto encontrado/i)).toBeVisible({ timeout: 10_000 });
  });

  test('contador "Cadastrados (N de M)" reflete o filtro', async ({ page }) => {
    await page.goto('/product');
    // Sem filtro: deve aparecer só "Cadastrados (N)" — sem o sufixo "de"
    const heading = page.getByRole('heading', { name: /^Cadastrados/ });
    await expect(heading).toBeVisible();

    // Aplica filtro: aparece "X de Y"
    const filtros = page.getByRole('navigation', { name: /filtrar por categoria/i });
    await filtros.getByRole('button', { name: new RegExp(CAT_A_LABEL) }).click();
    await expect(page.getByRole('heading', { name: /Cadastrados \(\d+ de \d+\)/ })).toBeVisible({ timeout: 10_000 });
  });
});
