import { test } from "@playwright/test";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

test("ARCA - Generación de CSR y descarga de PFX desde AFIP con modal Continuar", async ({ page }) => {
  const año = new Date().getFullYear();
  const csrsFolder = path.join(__dirname, "../csrs");
  if (!fs.existsSync(csrsFolder)) fs.mkdirSync(csrsFolder, { recursive: true });

  // ===== Leer datos desde index.html =====
  await page.goto(
    "C:/Users/tomyg/Documents/Programación/Playwright/trizap2/trizap/index.html"
  );

  await page.waitForSelector("#resultados p");
  const resultados = await page.$$eval("#resultados p", (elements) => {
    return elements.map((p) => p.textContent.split(":")[1].trim());
  });

  let [CUIT, CUIL, clave] = resultados;
  console.log(`Empresa: ${CUIT}, Persona: ${CUIL}, Clave: ${clave}`);

  // ===== Login en AFIP =====
  await page.goto("https://www.afip.gob.ar/landing/default.asp");
  const loginPopupPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Iniciar sesión" }).click();
  const loginPage = await loginPopupPromise;

  await loginPage.getByRole("spinbutton").fill(CUIL);
  await loginPage.getByRole("button", { name: "Siguiente" }).click();
  await loginPage.locator('input[type="password"]:visible').fill(clave);
  await loginPage.getByRole("button", { name: "Ingresar" }).click();

  const razonSocial = (await loginPage.locator("nav#cabeceraAFIPlogoNegro strong.text-primary").textContent())?.trim();
  if (!razonSocial) throw new Error("No se pudo obtener la razón social.");
  const razonSocial2 = razonSocial.replace(/\s+/g, "_");

  const clavePrivada = path.join(csrsFolder, `MiClavePrivada_${razonSocial2}_${año}.key`);
  const csrPath = path.join(csrsFolder, `MiPedidoCSR_${razonSocial2}_${año}.csr`);

  // ===== Generar clave privada y CSR =====
  execSync(`openssl genrsa -out "${clavePrivada}" 2048`);
  execSync(
    `openssl req -new -key "${clavePrivada}" ` +
    `-subj "/C=AR/O=Agencia ${razonSocial2} SAS/CN=Sistema de Gestion/serialNumber=CUIT ${CUIT}" ` +
    `-out "${csrPath}"`
  );

  // ===== Administración de certificados =====
  // Buscar "certificados dig" en el buscador
await loginPage.getByRole("combobox", { name: "Buscador" }).fill("certificados dig");

// Click en "Administración de" y seguimos en la misma página
await loginPage.getByRole("link", { name: "Administración de" }).click();
const adminPage = loginPage; // todo sigue en la misma página
await adminPage.waitForTimeout(2000); // esperar que cargue la sección


  await adminPage.waitForTimeout(2000); // Espera a que cargue

  // ===== Manejo modal "Continuar" =====
  console.log("🔍 Buscando botón 'Continuar' en modal...");
  const todosLosBotones = await adminPage.locator('button').all();
  let clickeado = false;

  for (let i = 0; i < todosLosBotones.length; i++) {
    const texto = await todosLosBotones[i].textContent();
    if (texto?.includes("Continuar")) {
      try {
        await todosLosBotones[i].click();
        console.log(`✅ CLICKEADO botón 'Continuar' (${i})`);
        clickeado = true;
        await adminPage.waitForTimeout(2000);
        break;
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.log(`❌ No se pudo clickear botón 'Continuar' (${i}): ${errorMessage}`);
      }
    }
  }
  if (!clickeado) console.log("ℹ️ No se encontró botón 'Continuar', seguimos flujo.");

  // ===== Subir CSR y agregar alias =====
  const alias = `CERTIFICADO${razonSocial2}_${Date.now()}`;
  await adminPage.locator("#txtAliasCertificado").fill(alias);
  await adminPage.locator('input[type="file"]').setInputFiles(csrPath);
  await adminPage.waitForTimeout(1500);

  await adminPage.locator("#cmdIngresar").click();
  await adminPage.waitForTimeout(2000);

  const aliasRows = adminPage.locator("table tr td:first-child");
  await aliasRows.last().waitFor({ state: "visible", timeout: 10000 });
  const lastAlias = await aliasRows.last().textContent();
  console.log("Último alias creado:", lastAlias?.trim());

  // ===== Descargar CRT =====
  await adminPage.getByRole("link", { name: "Ver" }).nth(0).click();
  await adminPage.waitForTimeout(2000);
  const downloadPromise = adminPage.waitForEvent("download");
  await adminPage.getByRole("button", { name: "Descargar" }).click();
  const download = await downloadPromise;
  const crtPath = path.join(csrsFolder, `CertificadoDN_${razonSocial2}_${año}.crt`);
  await download.saveAs(crtPath);
  console.log(`CRT descargado: ${crtPath}`);

  // ===== Generar PFX =====
  const pfxPath = path.join(csrsFolder, `Certificado_${razonSocial2}_${año}.pfx`);
  execSync(`openssl pkcs12 -export -out "${pfxPath}" -inkey "${clavePrivada}" -in "${crtPath}" -passout pass:`);
  console.log(`PFX generado: ${pfxPath}`);

  console.log("✅ Flujo completo con modal 'Continuar' manejado.");
  await page.pause();
});
