import { Page, expect } from '@playwright/test';

// Identifica os dados criados nesta corrida — facilita o cleanup posterior.
// Forma curta para caber em campos com tamanho limitado.
export const RUN_ID = process.env.PW_RUN_ID ?? `T${Date.now().toString(36).slice(-6)}`;
export const TAG = `[TEST-${RUN_ID}]`;

export function tagged(label: string): string {
  return `${TAG} ${label}`;
}

// Códigos numéricos únicos para clientes (faixa alta para não colidir com seed)
let codeCounter = 0;
export function nextClientCode(): number {
  codeCounter += 1;
  // 90000+ baseado no timestamp + counter, evita colisão entre runs
  return 900000 + (Math.floor(Date.now() / 1000) % 90000) + codeCounter;
}

export async function dismissToast(page: Page): Promise<void> {
  const toast = page.locator('[role="status"], [role="alert"]').first();
  if (await toast.count()) {
    await toast.click({ trial: true }).catch(() => {});
  }
}

export async function waitForToast(page: Page, pattern: RegExp): Promise<void> {
  await expect(page.locator('[role="status"], [role="alert"]').filter({ hasText: pattern }))
    .toBeVisible({ timeout: 10_000 });
}

export const PROD_URL = 'https://minibox-five.vercel.app';
