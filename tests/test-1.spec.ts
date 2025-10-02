import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.afip.gob.ar/landing/default.asp');
  const page1Promise = page.waitForEvent('popup');
  await page.getByRole('link', { name: 'Iniciar sesión' }).click();
  const page1 = await page1Promise;
  await page1.getByRole('spinbutton').fill('27480721050');
  await page1.getByRole('button', { name: 'Siguiente' }).click();
  await page1.getByRole('textbox', { name: 'TU CLAVE' }).press('CapsLock');
  await page1.getByRole('textbox', { name: 'TU CLAVE' }).fill('L');
  await page1.getByRole('textbox', { name: 'TU CLAVE' }).press('CapsLock');
  await page1.getByRole('textbox', { name: 'TU CLAVE' }).fill('Lutoviso14');
  await page1.getByRole('button', { name: 'Ingresar' }).click();
  await page1.getByRole('combobox', { name: 'Buscador' }).click();
  await page1.getByRole('combobox', { name: 'Buscador' }).fill('certificados di');
  await page1.getByRole('link', { name: 'Administración de' }).click();
  const page2Promise = page1.waitForEvent('popup');
  await page1.getByRole('button', { name: 'Continuar' }).click();
  const page2 = await page2Promise;
});