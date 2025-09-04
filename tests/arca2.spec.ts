import { test, expect } from "@playwright/test";

test("ARCA", async ({ page }) => {
  await page.goto(
    "https://seti.afip.gob.ar/padron-puc-constancia-internet/ConsultaConstanciaAction.do",
    { waitUntil: "networkidle" }
  );

  const iframeElement = await page.waitForSelector("iframe", {
    timeout: 10000,
  });
  const frame = await iframeElement.contentFrame();

  if (!frame) throw new Error("No se pudo obtener el frame del iframe.");

  const input = frame.locator("#cuit");

  await input.waitFor({ state: "visible", timeout: 10000 });

  const CUIT = "27480721050";
  await input.fill(CUIT);

  await input.evaluate((el) => {
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  });

  console.log("CUIT ingresado correctamente.");

  await frame.waitForFunction(
    () => {
      const captchaInput = document.getElementById(
        "captchaField"
      ) as HTMLInputElement;
      return captchaInput && captchaInput.value.length === 5;
    },
    { timeout: 0 }
  );

  console.log("CAPTCHA ingresado correctamente.");

  await frame.locator("#btnConsultar").click();

  await page.waitForTimeout(5000);

  const fontLocator = frame.locator('font[face="Arial"][size="1"]');
  const primerFont = fontLocator.nth(1);
  h;
  await primerFont.waitFor({ state: "visible", timeout: 10000 });

  const razonSocial = await primerFont.textContent();

  const razonSocial2 = razonSocial?.trim();

  console.log(razonSocial2);

  await page.pause();
});
