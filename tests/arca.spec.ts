import { test } from "@playwright/test";

test("Arca", async ({ page }) => {
  await page.goto("https://www.afip.gob.ar/landing/default.asp");
  await page.getByRole("link", { name: "Iniciar sesión" }).click();
  await page
    .locator('//input[@id="Fl:username"] .form-group m-b-1 #F1:username')
    .fill("20304050607");
  await page.pause();
});
