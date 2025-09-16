import { test, expect } from "@playwright/test";

test("has title", async ({ page }) => {
    await page2.locator('#cmdNuevaRelacion').click();
    await page2.getByRole('button', { name: 'Modificar el Servicio' }).click();
    await page2.getByRole('img', { name: 'Agencia de Recaudación y' }).click();
    await page2.getByRole('cell', { name: 'WebServices', exact: true }).click();
    await page2.getByRole('link', { name: 'Facturación Electrónica' }).click();
    await page2.getByRole('button', { name: 'Buscar representante para la' }).click();
    await page2.locator('#cboComputadoresAdministrados').selectOption('Mjc0ODA3MjEwNTA6Q0VSVElGSUNBRE9HRVJCQVVETyBWSUNUT1JJQSBBQlJJTA==');
    await page2.goto('https://serviciosweb.afip.gob.ar/ClaveFiscal/AdminRel/userSearch.aspx?representado=27480721050&serviceName=ws://wsfe');
    await page2.locator('#cmdSeleccionarServicio').click();
    await page2.getByRole('button', { name: 'Confirme aquí la generación' }).click();
    await page2.goto('https://serviciosweb.afip.gob.ar/ClaveFiscal/AdminRel/relationAdd.aspx?representado=27480721050&serviceName=ws://wsfe&representante=Mjc0ODA3MjEwNTA6Q0VSVElGSUNBRE9HRVJCQVVETyBWSUNUT1JJQSBBQlJJTA==');
});
