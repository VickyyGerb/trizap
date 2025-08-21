import { test } from "@playwright/test";
import fs from "fs";
import archiver from "archiver";

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
  await page.getByRole("button", { name: "Cancelar" }).click();

  // Esperar el evento de descarga mientras se hace el click
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByTitle("Generar PDF").nth(0).click(),
  ]);

  // Guardar el archivo descargado
  const filePath = "C:/Users/Estudiante/Downloads/miArchivo.pdf";
  await download.saveAs(filePath);

  // Comprimirlo en ZIP
  const zipPath = "C:/Users/Estudiante/Downloads/miArchivo.zip";
  const output = fs.createWriteStream(zipPath);
  const archive = archiver("zip", { zlib: { level: 9 } });

  archive.pipe(output);
  archive.file(filePath, { name: "miArchivo.pdf" });
  await archive.finalize();

  console.log(`Archivo comprimido en: ${zipPath}`);

  await page.waitForTimeout(2000); // opcional para asegurar que todo termine

  await page.pause()
});
