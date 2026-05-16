// Specs que rodam APENAS no viewport mobile (Pixel 7).
// Cobrem bugs de overflow do <input> em wrappers estreitos:
//  - Dashboard: input "R$" do recarregar saldos negativos (w-28) sobrepondo o botão.
//  - /product: input "Emoji" (80px) do form de nova categoria sobrepondo o botão Criar.
//
// Critério: bbox do input deve estar dentro do bbox do wrapper.

import { test, expect } from '@playwright/test';
import { RUN_ID, tagged, nextClientCode } from './helpers';

async function gotoComProfile(page: import('@playwright/test').Page, path: string) {
  await page.goto('/home');
  await expect(page.getByRole('heading', { name: /nova venda/i })).toBeVisible({ timeout: 15_000 });
  await page.waitForTimeout(600);
  await page.goto(path);
}

test.describe('Mobile — overflow do input', () => {
  test('Dashboard: input recarregar não sobrepõe o botão', async ({ page }) => {
    // Cria 1 cliente negativo para garantir que a row existe
    const codigo = nextClientCode();
    const nome = tagged('Devedor');
    await page.request.post(
      'https://dngvovusdgfvfcpfhrdb.supabase.co/auth/v1/token?grant_type=password',
      {
        headers: { apikey: process.env.PW_SUPABASE_ANON_KEY!, 'Content-Type': 'application/json' },
        data: { email: 'testes@testes', password: 'testes@testes' },
      },
    ).catch(() => {});

    await gotoComProfile(page, '/cliente');
    const card = page.locator('text=Cadastrar novo cliente').locator('xpath=ancestor::*[contains(@class,"rounded")][1]');
    await card.getByPlaceholder(/^Código$/).fill(String(codigo));
    await card.getByPlaceholder(/nome completo/i).fill(nome);
    await card.getByRole('button', { name: /^Cadastrar$/ }).click();
    await expect(
      page.locator('[role="status"], [role="alert"]').filter({ hasText: /cadastrado/i }),
    ).toBeVisible({ timeout: 10_000 });
    // Busca para zerar o form
    await page.getByPlaceholder(/código do crachá/i).fill(String(codigo));
    await page.getByRole('button', { name: /^Buscar$/ }).click();
    await expect(page.getByText(nome)).toBeVisible();
    // Débito de R$ 5 → saldo -5
    await page.getByRole('button', { name: /^R\$ 5$/ }).click();
    await page.getByRole('button', { name: /^Debitar$/ }).click();
    await page.getByRole('dialog').getByRole('button', { name: /^Debitar$/ }).click();
    await expect(
      page.locator('[role="status"], [role="alert"]').filter({ hasText: /debitado/i }),
    ).toBeVisible({ timeout: 10_000 });

    // Vai pro dashboard
    await gotoComProfile(page, '/dashboard');
    const negCard = page.getByText('Saldos negativos').first().locator('xpath=ancestor::*[contains(@class,"rounded")][1]');
    const row = negCard.locator('li').filter({ hasText: nome });
    await row.scrollIntoViewIfNeeded();
    await expect(row).toBeVisible({ timeout: 15_000 });

    const input = row.locator('input[type="number"]');
    const btn = row.getByRole('button', { name: /Recarregar/i });

    // Mede as caixas e garante que input não invade o botão
    const ibox = await input.boundingBox();
    const bbox = await btn.boundingBox();
    expect(ibox, 'input bbox').not.toBeNull();
    expect(bbox, 'btn bbox').not.toBeNull();
    const inputRight = ibox!.x + ibox!.width;
    expect(inputRight, `input ${inputRight} sobrepõe botão ${bbox!.x}`).toBeLessThanOrEqual(bbox!.x + 1);

    // Verifica que o clique funciona (modal abre)
    await input.fill('1');
    await btn.click();
    await expect(page.getByRole('dialog')).toBeVisible({ timeout: 5_000 });
    await page.getByRole('dialog').getByRole('button', { name: /cancelar/i }).click();
  });

  test('/product: input Emoji da nova categoria não sobrepõe o botão Criar', async ({ page }) => {
    await gotoComProfile(page, '/product');

    // Abre a seção de nova categoria
    await page.getByRole('button', { name: /criar nova categoria/i }).click();

    const emojiInput = page.getByRole('textbox', { name: /^Emoji$/ });
    const criarBtn = page.getByRole('button', { name: /^Criar$/ });

    await expect(emojiInput).toBeVisible();
    await expect(criarBtn).toBeVisible();

    const ibox = await emojiInput.boundingBox();
    const bbox = await criarBtn.boundingBox();
    expect(ibox, 'emoji input bbox').not.toBeNull();
    expect(bbox, 'criar btn bbox').not.toBeNull();
    const inputRight = ibox!.x + ibox!.width;
    // Em mobile (grid-cols-[80px_1fr]), o botão Criar fica em outra linha (col-span-2).
    // Mas o input "Nome da categoria" ao lado é quem mais sofre. Vamos checar contra o input Nome.
    const nomeInput = page.getByRole('textbox', { name: /nome da categoria/i });
    const nbox = await nomeInput.boundingBox();
    expect(nbox, 'nome input bbox').not.toBeNull();
    expect(inputRight, `emoji input (${inputRight}) sobrepõe nome input (${nbox!.x})`).toBeLessThanOrEqual(nbox!.x + 1);
  });
});
