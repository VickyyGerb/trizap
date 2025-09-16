import { test, expect } from "@playwright/test";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

test("ARCA - Generación de CSR y descarga de PFX desde AFIP", async ({ page }) => {
  const año = new Date().getFullYear();
  const CUIT = "27480721050";

  // ===== Carpeta fija para CSR y clave privada =====
  const csrsFolder = path.join(__dirname, "../csrs");
  if (!fs.existsSync(csrsFolder)) fs.mkdirSync(csrsFolder, { recursive: true });

  // ===== Navegar al portal AFIP para consultar CUIT =====
  await page.goto(
    "https://seti.afip.gob.ar/padron-puc-constancia-internet/ConsultaConstanciaAction.do",
    { waitUntil: "networkidle" }
  );

  const iframeElement = await page.waitForSelector("iframe", { timeout: 10000 });
  const frame = await iframeElement.contentFrame();
  if (!frame) throw new Error("No se pudo obtener el frame del iframe.");

  const input = frame.locator("#cuit");
  await input.waitFor({ state: "visible", timeout: 10000 });
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
  console.log("Razón social obtenida:", razonSocial);

  if (!razonSocial) throw new Error("No se pudo obtener la razón social.");
  const razonSocial2 = razonSocial.replace(/\s+/g, "_");

  // ===== Nombres dinámicos para archivos =====
  const clavePrivada = path.join(csrsFolder, `MiClavePrivada${razonSocial2}_${año}.key`);
  const csrPath = path.join(csrsFolder, `MiPedidoCSR${razonSocial2}_${año}.csr`);

  // ===== Generar clave privada y CSR automáticamente =====
  execSync(`openssl genrsa -out "${clavePrivada}" 2048`);
  console.log(`Clave privada generada: ${clavePrivada}`);

  execSync(
    `openssl req -new -key "${clavePrivada}" ` +
      `-subj "/C=AR/O=Agencia ${razonSocial2} SAS/CN=Sistema de Gestion/serialNumber=CUIT ${CUIT}" ` +
      `-out "${csrPath}"`
  );
  console.log(`CSR generado: ${csrPath}`);

  // ===== Ir a landing AFIP e iniciar sesión =====
  await page.goto("https://www.afip.gob.ar/landing/default.asp");
  const loginPopupPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Iniciar sesión" }).click();
  const loginPage = await loginPopupPromise;

  await loginPage.getByRole("spinbutton").fill(CUIT);
  await loginPage.getByRole("button", { name: "Siguiente" }).click();
  await loginPage.locator('input[type="password"]:visible').fill("PickyyCiro1712");
  await loginPage.getByRole("button", { name: "Ingresar" }).click();

  // ===== Administración de certificados =====
  await loginPage.getByRole("combobox", { name: "Buscador" }).fill("certificados dig");
  const adminPopupPromise = loginPage.waitForEvent("popup");
  await loginPage.getByRole("link", { name: "Administración de" }).click();
  const adminPage = await adminPopupPromise;

  await adminPage.locator("#cmdIngresar").click();
  await adminPage.waitForTimeout(2000);

  // ===== Crear alias y subir CSR =====
const alias = `CERTIFICADO${razonSocial2}_${Date.now()}`;
  const aliasInput = adminPage.locator("#txtAliasCertificado");
  await aliasInput.click();
  await aliasInput.fill(alias);

  const fileInput = adminPage.locator('input[type="file"]');
  await fileInput.setInputFiles(csrPath);

  await page.waitForTimeout(1500); // Esperar un segundo extra para que AFIP procese el archivo


  // ===== ESPERAR BOTÓN "Agregar alias" HABILITADO =====
  await adminPage.locator("#cmdIngresar").click();

  console.log("✅ Alias agregado correctamente.");

  await adminPage.waitForTimeout(2000);

 const aliasRows = adminPage.locator("table tr td:first-child"); // columna Alias
await aliasRows.last().waitFor({ state: "visible", timeout: 10000 });

const lastAlias = await aliasRows.last().textContent();
console.log("Último alias creado:", lastAlias?.trim());

// ===== Descargar el PFX correspondiente al último alias =====
await adminPage.getByRole(`link`, { name: "Ver" }).nth(0).click();
await adminPage.waitForTimeout(2000);
const downloadPromise = adminPage.waitForEvent("download");
await adminPage.getByRole("button", { name: "Descargar" }).click();
const download = await downloadPromise;

const pfxFile = path.join(csrsFolder, `Certificado_${lastAlias?.trim()}_${año}.pfx`);
await download.saveAs(pfxFile);
console.log(`PFX descargado correctamente: ${pfxFile}`);

  console.log("✅ Flujo completo: CSR generado, subido y PFX descargado.");
  await page.pause();
});
