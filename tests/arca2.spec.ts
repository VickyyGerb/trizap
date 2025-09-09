import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import fs from "fs";

test("ARCA", async ({ page, context }) => {
  const año = new Date().getFullYear();

  // Navegar al sitio AFIP para consultar CUIT
  await page.goto(
    "https://seti.afip.gob.ar/padron-puc-constancia-internet/ConsultaConstanciaAction.do",
    { waitUntil: "networkidle" }
  );

  const iframeElement = await page.waitForSelector("iframe", { timeout: 10000 });
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
      const captchaInput = document.getElementById("captchaField") as HTMLInputElement;
      return captchaInput && captchaInput.value.length === 5;
    },
    { timeout: 0 }
  );
  console.log("CAPTCHA ingresado correctamente.");

  await frame.locator("#btnConsultar").click();
  await page.waitForTimeout(5000);

  const fontLocator = frame.locator('font[face="Arial"][size="1"]');
  const primerFont = fontLocator.nth(1);
  await primerFont.waitFor({ state: "visible", timeout: 10000 });
  const razonSocial = (await primerFont.textContent())?.trim();
  console.log(razonSocial);

  const clavePrivada = `MiClavePrivada${razonSocial}_${año}`;
  const pedidoCSR   = `MiPedidoCSR${razonSocial}_${año}`;
  const certPfx     = `Certificado${razonSocial}_${año}.pfx`;

  const certDNConaño = `CertificadoDN${razonSocial}_${año}.crt`;
  const certDNSinaño = `CertificadoDN${razonSocial}.crt`;
  const certDNInput  = fs.existsSync(certDNConaño) ? certDNConaño : certDNSinaño;

  execSync(`openssl genrsa -out "${clavePrivada}" 2048`);
  console.log(`Clave privada generada: ${clavePrivada}`);

  execSync(
    `openssl req -new -key "${clavePrivada}" ` +
    `-subj "/C=AR/O=Agencia ${razonSocial} SAS/CN=Sistema de Gestion/serialNumber=CUIT ${CUIT}" ` +
    `-out "${pedidoCSR}" -config "C:\\Program Files\\OpenSSL-Win64\\bin\\openssl.cfg"`
  );
  console.log(`CSR generado: ${pedidoCSR}`);

  // Ir a landing AFIP e iniciar sesión
  await page.goto("https://www.afip.gob.ar/landing/default.asp");

  const [loginPage] = await Promise.all([
    context.waitForEvent("page"),
    page.getByRole("link", { name: "Iniciar sesión" }).click(),
  ]);

  await loginPage.waitForLoadState("domcontentloaded");
  await loginPage.locator("#F1\\:username").fill(CUIT);
  await loginPage.getByRole("button", {name: "Siguiente"}).click();

  const claveInput = loginPage.locator('input[type="password"]:visible');
  await claveInput.waitFor({ state: "visible" });
  await claveInput.type("PickyyCiro1712", { delay: 100 });
  await loginPage.getByRole("button", {name: "Ingresar"}).click();

  
  await loginPage.waitForLoadState("domcontentloaded");

  await loginPage.waitForURL('https://portalcf.cloud.afip.gob.ar/portal/app/**', { timeout: 15000 });

  const frame2 = loginPage.frames().find(f => f.url().includes("/portal/app/"));
  if (!frame2) throw new Error("No se encontró el iframe con el portal de AFIP");

  await frame2.locator('a[href="/portal/app/mis-servicios"]').click();

  await frame2.getByRole("heading", { name: "ADMINISTRADOR DE RELACIONES DE CLAVE FISCAL" }).click();

  const boton = frame2.locator('input[name="cmdAgregarServicio"]');
  await boton.waitFor({ state: "visible", timeout: 10000 }); // opcional, pero recomendable
  await boton.click(); 


  await page.pause();
});
