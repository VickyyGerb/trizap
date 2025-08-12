import { test, expect } from "@playwright/test";

test("Octus", async ({ page }) => {
  await page.goto("https://dev.octus.com.ar/");
  await page.getByRole("link", { name: "Iniciar sesión" }).click();

  await page
    .getByRole("textbox", { name: "E-mail" })
    .fill("regional@octus.com.ar");
  await page.locator('input[id="userPass"]').fill("pass");
  await page.getByRole("button", { name: "Ingresar" }).click();

  await page.getByRole("link", { name: "Facturación" }).click();
  await page.locator('input[id="nroFactura"]').fill("123456");
  await page.getByRole("textbox", { name: "Fecha" }).fill("12/08/2025");
  const input = page.locator('[autocomplete="new_cliente"]');

  await page.pause();
});
