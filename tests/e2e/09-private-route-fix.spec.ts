import { test, expect } from '@playwright/test';

test.describe('Verifica fix do PrivateRoute (sem workaround de /home)', () => {
  test('/dashboard carrega direto sem piscar /home', async ({ page }) => {
    const navigations: string[] = [];
    page.on('framenavigated', (f) => { if (f === page.mainFrame()) navigations.push(f.url()); });

    await page.goto('/dashboard');
    // A URL final precisa ser /dashboard
    await expect(page).toHaveURL(/\/dashboard$/);
    // Heading do dashboard precisa aparecer (sem redirect para /home)
    await expect(page.getByText('Total recarregado').first()).toBeVisible({ timeout: 15_000 });

    // Não pode ter passado pela URL /home no meio
    const passouPorHome = navigations.some((u) => /\/home$/.test(u));
    expect(passouPorHome, `Navegou por: ${navigations.join(' -> ')}`).toBe(false);
  });

  test('/usuarios carrega direto sem piscar /home', async ({ page }) => {
    const navigations: string[] = [];
    page.on('framenavigated', (f) => { if (f === page.mainFrame()) navigations.push(f.url()); });

    await page.goto('/usuarios');
    await expect(page).toHaveURL(/\/usuarios$/);
    await expect(page.getByRole('heading', { name: /^Usuários$/ })).toBeVisible({ timeout: 15_000 });

    const passouPorHome = navigations.some((u) => /\/home$/.test(u));
    expect(passouPorHome, `Navegou por: ${navigations.join(' -> ')}`).toBe(false);
  });
});
