import { test } from "@playwright/test";
import fs from "fs";
import archiver from "archiver";
import os from "os";
import path from "path";

let lastDownloadedFile = ""; // 🔹 variable compartida

test("Octus - descargar y comprimir PDF", async ({ page }) => {
  await page.goto("https://dev.octus.com.ar/");
  await page.getByRole("link", { name: "Iniciar sesión" }).click();

  await page
    .getByRole("textbox", { name: "E-mail" })
    .fill("regional@octus.com.ar");
  await page.locator('input[id="userPass"]').fill("pass");
  await page.getByRole("button", { name: "Ingresar" }).click();

  await page.getByRole("link", { name: "Gestión" }).click();
  await page.getByRole("menuitem", { name: "Facturas" }).click();

  await page.getByRole("button", { name: "Refacturar" }).click();
  await page.getByRole;
  await page.getByRole("button", { name: "Cancelar" }).click();

  await page.waitForTimeout(2000);

  // Generar nombre único con fecha y hora
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const downloadName = `factura_${timestamp}.pdf`;
  const zipName = `factura_${timestamp}.zip`;

  // ✅ Ruta dinámica según el usuario/sistema
  const downloadDir = path.join(os.homedir(), "Downloads");
  const filePath = path.join(downloadDir, downloadName);
  const zipPath = path.join(downloadDir, zipName);

  // Esperar el evento de descarga mientras se hace el click
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTitle("Generar PDF").nth(0).click(),
  ]);

  // Guardar el archivo PDF con nombre único
  await download.saveAs(filePath);

  await download.saveAs(filePath);
  lastDownloadedFile = filePath; // 🔹
  console.log(`✅ PDF guardado en: ${filePath}`);

  // Crear el ZIP con el mismo timestamp
  const output = fs.createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.pipe(output);
  archive.file(filePath, { name: downloadName });
  await archive.finalize();

  console.log(`✅ PDF guardado en: ${filePath}`);
  console.log(`✅ ZIP creado en: ${zipPath}`);

  await download.saveAs(filePath);
  lastDownloadedFile = filePath; // 🔹 guardamos la ruta del archivo

  await page.waitForTimeout(2000); // opcional
  await page.pause(); // para inspeccionar
});

test("formulario", async ({ page }) => {
  await page.goto(
    "C:Users/Estudiante/Desktop/Vickyy/playwright/Trizap/index.html"
  );

  await page.getByRole("textbox", { name: "Nombre:" }).fill("Vicky Gerbaudo");
  await page
    .getByRole("textbox", { name: "Correo electrónico:" })
    .fill("vickyag2007@gmail.com");
  await page
    .getByRole("combobox", { name: "Asunto:" })
    .selectOption("Sugerencia");

  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0"); // +1 porque los meses arrancan en 0
  const year = today.getFullYear();
  const formattedDate = `${year}-${month}-${day}`;

  await page
    .getByRole("textbox", { name: "Fecha de contacto:" })
    .fill(formattedDate);
  await page
    .getByRole("textbox", { name: "Mensaje:" })
    .fill("Estrene el inodoro del baño");

  await page.getByRole("button", { name: "Adjuntar archivo:" }).click();

  await page.waitForTimeout(2000); // opcional

  await page.getByRole("button", { name: "Enviar" }).click();
  await page.pause();
});
