/**
 * Importa el padrón electoral desde un CSV y genera los tokens de acceso.
 *
 *   npm run padron:importar -- ruta/padron.csv [--regenerar]
 *
 * Columnas (cabecera obligatoria, separador "," o ";"): codigo, dni, nombres, apellidos, correo
 * Exportar desde Excel como "CSV UTF-8". Los tokens en claro quedan en salida/tokens-<fecha>.csv;
 * en la base de datos solo se guarda su hash, así que ese archivo es la única copia.
 */
import { prisma } from "../lib/prisma";
import { escribirCsv, leerCsv, registrarPadron, validarPadron } from "./comun";

async function main() {
  const ruta = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!ruta) throw new Error("Indica el archivo: npm run padron:importar -- padron.csv");
  const regenerar = process.argv.includes("--regenerar");

  const { padron, errores } = validarPadron(leerCsv(ruta));
  if (errores.length) throw new Error(`Corrige el archivo antes de importar:\n  ${errores.join("\n  ")}`);

  const tokens = await registrarPadron(padron, regenerar);
  const marca = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
  console.log(`✔ ${padron.length} votantes procesados.`);
  if (tokens.length) {
    console.log(`✔ ${tokens.length} tokens nuevos → ${escribirCsv(`tokens-${marca}.csv`, tokens)}`);
  } else {
    console.log("  Todos los votantes ya tenían token (usa --regenerar para reemplazar los pendientes).");
  }
}

main()
  .catch((e) => {
    console.error("✖", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
