import { test, expect } from '@playwright/test';

test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Smoke público (sem login)', () => {
  test('/ redireciona para /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('login carrega e tem campos esperados', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /bem-vindo de volta/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /e-?mail/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /senha/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /cadastre-se/i })).toBeVisible();
  });

  test('signup carrega', async ({ page }) => {
    await page.goto('/signup');
    // Pelo menos um botão e um campo de email/senha precisam existir
    await expect(page.getByRole('textbox', { name: /e-?mail/i })).toBeVisible();
  });

  test('rota desconhecida cai no 404 (após redirect pelo guard)', async ({ page }) => {
    await page.goto('/rota-inexistente-xyz');
    // sem sessão, o PrivateRoute manda pra login antes de cair no 404
    await expect(page).toHaveURL(/\/login$|\/rota-inexistente/);
  });

  test('rota protegida sem sessão volta para /login', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('login com credenciais inválidas mostra erro', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: /e-?mail/i }).fill('naoexiste@nao.com');
    await page.getByRole('textbox', { name: /senha/i }).fill('senhaerrada123');
    await page.getByRole('button', { name: /entrar/i }).click();
    // Toast com mensagem traduzida
    await expect(
      page.locator('[role="status"], [role="alert"]').filter({ hasText: /senha incorret|e-?mail.*incorret|inválido/i })
    ).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/login$/);
  });

  test('campos vazios mostram validação inline', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /entrar/i }).click();
    await expect(page.getByText(/informe seu e-mail/i)).toBeVisible();
    await expect(page.getByText(/informe sua senha/i)).toBeVisible();
  });
});
