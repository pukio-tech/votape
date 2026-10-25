/**
 * Crea el proceso electoral (cargos y candidatos) a partir de un JSON.
 *
 *   npm run eleccion:cargar -- datos/eleccion.json
 *
 * Ver el formato en datos/eleccion.ejemplo.json. Las fotos van en public/candidatos/
 * y se referencian como "/candidatos/archivo.jpg". La elección queda en CONFIGURACION;
 * se activa desde /admin.
 */
import { readFileSync } from "node:fs";
import { prisma } from "../lib/prisma";
import { crearEleccion, type DatosEleccion } from "./comun";

async function main() {
  const ruta = process.argv[2];
  if (!ruta) throw new Error("Indica el archivo: npm run eleccion:cargar -- datos/eleccion.json");

  const datos = JSON.parse(readFileSync(ruta, "utf8")) as DatosEleccion;
  if (!datos.titulo || !datos.cargos?.length) throw new Error("El JSON debe tener 'titulo' y al menos un cargo.");
  if (Number.isNaN(Date.parse(datos.fechaInicio)) || Number.isNaN(Date.parse(datos.fechaCierre))) {
    throw new Error("fechaInicio / fechaCierre no son fechas válidas (usa ISO, ej. 2026-11-12T08:00:00-05:00).");
  }
  for (const cargo of datos.cargos) {
    if (!cargo.candidatos?.length) throw new Error(`El cargo "${cargo.nombre}" no tiene candidatos.`);
  }

  const proceso = await crearEleccion(datos);
  const candidatos = datos.cargos.reduce((s, c) => s + c.candidatos.length, 0);
  console.log(`✔ "${proceso.titulo}" creada con ${datos.cargos.length} cargos y ${candidatos} candidatos.`);
  console.log("  Estado: CONFIGURACION. Actívala desde /admin.");
}

main()
  .catch((e) => {
    console.error("✖", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
