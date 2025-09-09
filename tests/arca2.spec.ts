import { test, expect } from "@playwright/test";
import { getAllByRole, getByRole, within } from "@testing-library/react";
import { screen } from "@testing-library/react";
import { execSync } from "child_process";
import fs from "fs";

test("ARCA", async ({ page, context }) => {
  const año = new Date().getFullYear();

  // Navegar al sitio AFIP para consultar CUIT
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
  await primerFont.waitFor({ state: "visible", timeout: 10000 });
  const razonSocial = (await primerFont.textContent())?.trim();
  console.log(razonSocial);

  const clavePrivada = `MiClavePrivada${razonSocial}_${año}`;
  const pedidoCSR = `MiPedidoCSR${razonSocial}_${año}`;
  const certPfx = `Certificado${razonSocial}_${año}.pfx`;

  const certDNConaño = `CertificadoDN${razonSocial}_${año}.crt`;
  const certDNSinaño = `CertificadoDN${razonSocial}.crt`;
  const certDNInput = fs.existsSync(certDNConaño) ? certDNConaño : certDNSinaño;

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
  const page1Promise = page.waitForEvent("popup");
  await page.getByRole("link", { name: "Iniciar sesión" }).click();
  const page1 = await page1Promise;
  await page1.getByRole("spinbutton").click();
  await page1.getByRole("spinbutton").fill("27480721050");
  await page1.getByRole("button", { name: "Siguiente" }).click();

  await page1.locator('input[type="password"]:visible').fill("PickyyCiro1712");
  await page1.getByRole("button", { name: "Ingresar" }).click();

  await page1.getByRole("combobox", { name: "Buscador" }).click();
  await page1
    .getByRole("combobox", { name: "Buscador" })
    .fill("certificados dig");
  const page2Promise = page1.waitForEvent("popup");
  await page1.getByRole("link", { name: "Administración de" }).click();
  const page2 = await page2Promise;
  await page2.locator("#cmdIngresar").click();
  await page2.waitForTimeout(2000);
  await page2.locator("#txtAliasCertificado").click();
  await page2.locator("#txtAliasCertificado").press("CapsLock");
  await page2.locator("#txtAliasCertificado").fill("CERTIFICADO" + razonSocial);
  await page2.locator("#txtAliasCertificado").press("CapsLock");
  //await page2.getByRole("button", { name: "Choose File" }).click();
  await page2
    .getByRole("button", { name: "Choose File" })
    .setInputFiles(pedidoCSR);
  await page2.locator("#cmdIngresar").click();
  await page2.goto(
    "https://serviciosweb.afip.gob.ar/clavefiscal/adminrel/verCertificado.aspx"
  );

  await page2.getByRole("link", { name: "Ver" }).nth(0).click();
  const downloadPromise = page2.waitForEvent("download");
  await page2.getByRole("button", { name: "Descargar" }).click();
  const download = await downloadPromise;

  await page.waitForTimeout(5000);

  await page2.goto("https://portalcf.cloud.afip.gob.ar/portal/app/");

  await page2.waitForTimeout(2000);

  await page2.getByRole("link", { name: "Ver todos" }).click();
  await page
    .getByRole("button", { name: "ADMINISTRADOR DE RELACIONES" })
    .click(); //VER POR QUE NO ANDA
  const page1b = await page1Promise;
  await page1b.locator("#cmdNuevaRelacion").click();
  await page1b.getByRole("button", { name: "Modificar el Servicio" }).click();
  await page1b.getByRole("cell", { name: "WebServices", exact: true }).click();
  await page1b.getByRole("link", { name: "Facturación Electrónica" }).click();
  await page1b
    .getByRole("button", { name: "Buscar representante para la" })
    .click();
  await page1b
    .locator("#cboComputadoresAdministrados")
    .selectOption(
      "Mjc0ODA3MjEwNTA6Q0VSVElGSUNBRE9HRVJCQVVETyBWSUNUT1JJQSBBQlJJTA=="
    );
  await page1b.goto(
    "https://serviciosweb.afip.gob.ar/ClaveFiscal/AdminRel/userSearch.aspx?representado=27480721050&serviceName=ws://wsfe"
  );
  await page1b.locator("#cmdSeleccionarServicio").click();
  const page2PromiseB = page1b.waitForEvent("popup");
  await page1b
    .getByRole("button", { name: "Confirme aquí la generación" })
    .click();
  const page2b = await page2PromiseB;
  await page1b
    .getByRole("paragraph")
    .filter({ hasText: "Haga click aquí para volver a" })
    .getByRole("link")
    .click();

  await page.pause();
});
