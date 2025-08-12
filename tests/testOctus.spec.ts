import { test, expect } from "@playwright/test";

test("Octus", async ({ page }) => {
  await page.goto("https://dev.octus.com.ar/");
  await page.getByRole("link", { name: "Iniciar sesión" }).click();
  await page
    .getByRole("textbox", { name: "E-mail" })
    .fill("colegiocba@octus.com.ar");
});
