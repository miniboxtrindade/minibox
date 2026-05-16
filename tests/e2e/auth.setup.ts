import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const adminFile = 'tests/.auth/admin.json';

setup('autentica admin', async ({ page }) => {
  fs.mkdirSync(path.dirname(adminFile), { recursive: true });

  await page.goto('/login');
  await page.getByRole('textbox', { name: /e-?mail/i }).fill('testes@testes');
  await page.getByRole('textbox', { name: /senha/i }).fill('testes@testes');
  await page.getByRole('button', { name: /entrar/i }).click();

  await page.waitForURL('**/home', { timeout: 15_000 });
  await expect(page.getByRole('heading', { name: /nova venda/i })).toBeVisible();

  await page.context().storageState({ path: adminFile });
});
