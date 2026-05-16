import { test, expect } from '@playwright/test';
import { RUN_ID, tagged, nextClientCode } from './helpers';

const CLIENT_CODE = nextClientCode();
const CLIENT_NAME = tagged('Cliente');

test.describe.serial('Clientes (admin)', () => {
  test('cadastra cliente novo', async ({ page }) => {
    await page.goto('/cliente');
    await expect(page.getByRole('heading', { name: /cadastrar novo cliente/i })).toBeVisible();

    // O form de cadastro está dentro do card "Cadastrar novo cliente"
    const card = page.locator('text=Cadastrar novo cliente').locator('xpath=ancestor::*[contains(@class,"rounded")][1]');
    await card.getByPlaceholder(/^Código$/).fill(String(CLIENT_CODE));
    await card.getByPlaceholder(/nome completo/i).fill(CLIENT_NAME);
    await card.getByRole('button', { name: /^Cadastrar$/ }).click();

    await expect(
      page.locator('[role="status"], [role="alert"]').filter({ hasText: /cadastrado/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('busca cliente e vê saldo zero', async ({ page }) => {
    await page.goto('/cliente');
    await page.getByPlaceholder(/código do crachá/i).fill(String(CLIENT_CODE));
    await page.getByRole('button', { name: /^Buscar$/ }).click();

    await expect(page.getByText(`#${CLIENT_CODE}`)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(CLIENT_NAME)).toBeVisible();
    await expect(page.getByText(/R\$ 0[.,]00/).first()).toBeVisible();
  });

  test('busca por código inexistente avisa', async ({ page }) => {
    await page.goto('/cliente');
    await page.getByPlaceholder(/código do crachá/i).fill('999999991');
    await page.getByRole('button', { name: /^Buscar$/ }).click();
    await expect(
      page.locator('[role="status"], [role="alert"]').filter({ hasText: /não encontrado/i })
    ).toBeVisible({ timeout: 10_000 });
  });

  test('recarrega R$ 20', async ({ page }) => {
    await page.goto('/cliente');
    await page.getByPlaceholder(/código do crachá/i).fill(String(CLIENT_CODE));
    await page.getByRole('button', { name: /^Buscar$/ }).click();
    await expect(page.getByText(CLIENT_NAME)).toBeVisible();

    // Usa valor rápido
    await page.getByRole('button', { name: /^R\$ 20$/ }).click();
    await page.getByRole('button', { name: /Recarregar/ }).click();

    // Modal de confirmação (role=dialog escopa o botão correto)
    await page.getByRole('dialog').getByRole('button', { name: /^Recarregar$/ }).click();

    await expect(
      page.locator('[role="status"], [role="alert"]').filter({ hasText: /recarregado/i })
    ).toBeVisible({ timeout: 10_000 });

    // Saldo atualiza (via realtime ou refetch)
    await expect(page.getByText(/R\$ 20[.,]00/).first()).toBeVisible({ timeout: 15_000 });
  });

  test('debita R$ 5', async ({ page }) => {
    await page.goto('/cliente');
    await page.getByPlaceholder(/código do crachá/i).fill(String(CLIENT_CODE));
    await page.getByRole('button', { name: /^Buscar$/ }).click();
    await expect(page.getByText(CLIENT_NAME)).toBeVisible();

    await page.getByRole('button', { name: /^R\$ 5$/ }).click();
    await page.getByRole('button', { name: /^Debitar$/ }).click();
    // Confirma na modal
    await page.getByRole('dialog').getByRole('button', { name: /^Debitar$/ }).click();

    await expect(
      page.locator('[role="status"], [role="alert"]').filter({ hasText: /debitado/i })
    ).toBeVisible({ timeout: 10_000 });

    await expect(page.getByText(/R\$ 15[.,]00/).first()).toBeVisible({ timeout: 15_000 });
  });

  test('histórico mostra recarga e débito', async ({ page }) => {
    await page.goto('/cliente');
    await page.getByPlaceholder(/código do crachá/i).fill(String(CLIENT_CODE));
    await page.getByRole('button', { name: /^Buscar$/ }).click();
    await expect(page.getByText(CLIENT_NAME)).toBeVisible();

    // O histórico fica logo abaixo; basta encontrar marcações de recarga e débito.
    await expect(page.locator('text=/Recarga|RECARGA/i').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('text=/Débito|DEBITO/i').first()).toBeVisible({ timeout: 15_000 });
  });
});
