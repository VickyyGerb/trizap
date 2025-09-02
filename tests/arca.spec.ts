import { test, expect } from "@playwright/test";

test("Arca", async ({ page, context }) => {
  const MANUAL_CUIL = false;

  await page.goto("https://www.afip.gob.ar/landing/default.asp");

  // Se abre una nueva pestaña al hacer click en "Iniciar sesión"
  const [loginPage] = await Promise.all([
    context.waitForEvent("page"),
    page.getByRole("link", { name: "Iniciar sesión" }).click(),
  ]);

  await loginPage.waitForLoadState("domcontentloaded");

  // (Opcional) si hay un botón previo al campo de CUIL
  await Promise.all([
    loginPage.waitForLoadState("networkidle").catch(() => {}),
    loginPage
      .getByRole("button", { name: /continuar|siguiente|aceptar/i })
      .click()
      .catch(() => {}),
  ]);

  // Espera a que el input de CUIL exista y sea visible
  await loginPage.waitForSelector("#F1\\:username", { state: "visible" });

  if (MANUAL_CUIL) {
    // 🔒 Espera indefinidamente hasta que el usuario complete 11 dígitos
    await loginPage.waitForFunction(
      (id) => {
        const el = document.getElementById(id);
        if (!el || !("value" in el)) return false;
        const digits = (String(el.value) || "").replace(/\D/g, "");
        return digits.length === 11;
      },
      "F1:username",
      { timeout: 0 }
    );
  } else {
    // Autocompletar CUIL
    await loginPage.locator("#F1\\:username").fill("27480721050");
  }

  // Presionamos Enter para continuar
  await Promise.all([
    loginPage.waitForLoadState("networkidle").catch(() => {}),
    loginPage.keyboard.press("Enter").catch(() => {}),
  ]);

  // 🔑 Espera a que aparezca el input de clave (password)
  const claveInput = loginPage.locator('input[type="password"]:visible');
  await claveInput.waitFor({ state: "visible" });

  // Escribir la clave
  await claveInput.type("PickyyCiro1712", { delay: 100 });

  // Presionamos Enter para continuar
  await loginPage.keyboard.press("Enter");

  // (Opcional) esperar que cargue la página siguiente
  await loginPage.waitForLoadState("networkidle");
});
