import { test } from "@playwright/test";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

test("ARCA - Generación de CSR y descarga de PFX desde AFIP", async ({
  page,
}) => {
  const año = new Date().getFullYear();

  // ===== Carpeta fija para CSR y clave privada =====
  const csrsFolder = path.join(__dirname, "../csrs");
  if (!fs.existsSync(csrsFolder)) fs.mkdirSync(csrsFolder, { recursive: true });

  // ===== Navegar al portal AFIP para consultar CUIT =====
  /* await page.goto(
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
  await page.waitForTimeout(5000); */

  // ===== Nombres dinámicos para archivos =====

  await page.goto("file:///C:/Users/tomyg/Documents/Programaci%C3%B3n/Playwright/trizap2/trizap/index.html")

  await page.waitForSelector('#resultados p');
  const resultados = await page.$$eval('#resultados p', elements => {
  
    return elements.map(p => p.textContent.split(':')[1].trim());
  });

  console.log(resultados);

  let [CUIT, CUIL, clave] = resultados;

  console.log(`Empresa: ${CUIT}, Persona: ${CUIL}, Clave: ${clave}`);



  await page.goto("https://www.afip.gob.ar/landing/default.asp");
  const loginPopupPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Iniciar sesión" }).click();
  const loginPage = await loginPopupPromise;

  await loginPage.getByRole("spinbutton").fill(CUIL);
  await loginPage.getByRole("button", { name: "Siguiente" }).click();
  await loginPage
    .locator('input[type="password"]:visible')
    .fill(clave);
  await loginPage.getByRole("button", { name: "Ingresar" }).click();

  const fontLocator = loginPage.locator('nav#cabeceraAFIPlogoNegro strong.text-primary'); //ver por que no anda!!!!
  const razonSocial = (await fontLocator.textContent())?.trim();
  console.log("Razón social obtenida:", razonSocial);

  if (!razonSocial) throw new Error("No se pudo obtener la razón social.");
  const razonSocial2 = razonSocial.replace(/\s+/g, "_");

  const clavePrivada = path.join(
    csrsFolder,
    `MiClavePrivada${razonSocial2}_${año}.key`
  );
  const csrPath = path.join(
    csrsFolder,
    `MiPedidoCSR${razonSocial2}_${año}.csr`
  );

  // ===== Generar clave privada y CSR automáticamente =====
  execSync(`openssl genrsa -out "${clavePrivada}" 2048`);
  console.log(`Clave privada generada: ${clavePrivada}`);

  execSync(
    `openssl req -new -key "${clavePrivada}" ` +
      `-subj "/C=AR/O=Agencia ${razonSocial2} SAS/CN=Sistema de Gestion/serialNumber=CUIT ${CUIT}" ` +
      `-out "${csrPath}"`
  );
  console.log(`CSR generado: ${csrPath}`);

  // ===== Administración de certificados =====
  await loginPage
    .getByRole("combobox", { name: "Buscador" })
    .fill("certificados dig");
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

  // ===== Descargar el CRT correspondiente al último alias =====
  await adminPage.getByRole(`link`, { name: "Ver" }).nth(0).click();
  await adminPage.waitForTimeout(2000);
  const downloadPromise = adminPage.waitForEvent("download");
  await adminPage.getByRole("button", { name: "Descargar" }).click();
  const download = await downloadPromise;
  const crtPath = path.join(
    csrsFolder,
    `CertificadoDN_${razonSocial2}_${año}.crt`
  );
  await download.saveAs(crtPath);

  console.log(`CRT descargado correctamente: ${crtPath}`);
  // ===== Generar PFX a partir del CRT descargado =====
  const pfxPath = path.join(
    csrsFolder,
    `Certificado_${razonSocial2}_${año}.pfx`
  );

  execSync(
    `openssl pkcs12 -export -out "${pfxPath}" -inkey "${clavePrivada}" -in "${crtPath}" -passout pass:`
  );

  console.log(`PFX generado localmente: ${pfxPath}`);

  console.log("✅ Flujo completo: CSR generado, subido y PFX descargado.");
  await page.pause();
});
