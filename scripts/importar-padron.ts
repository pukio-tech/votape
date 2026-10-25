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
import { escribirCsv, leerCsv, registrarPadron } from "./comun";

async function main() {
  const ruta = process.argv.slice(2).find((a) => !a.startsWith("--"));
  if (!ruta) throw new Error("Indica el archivo: npm run padron:importar -- padron.csv");
  const regenerar = process.argv.includes("--regenerar");

  const filas = leerCsv(ruta);
  const errores: string[] = [];
  const padron = filas.flatMap((f, i) => {
    const codigo = f.codigo || f.codigoestudiante || f.codigouniversitario;
    if (!codigo || !f.nombres || !f.apellidos) {
      errores.push(`Fila ${i + 2}: falta código, nombres o apellidos.`);
      return [];
    }
    return [{ codigoEstudiante: codigo, dni: f.dni || undefined, nombres: f.nombres, apellidos: f.apellidos, correo: f.correo || undefined }];
  });

  const repetidos = padron.map((p) => p.codigoEstudiante).filter((c, i, a) => a.indexOf(c) !== i);
  if (repetidos.length) errores.push(`Códigos repetidos en el archivo: ${[...new Set(repetidos)].join(", ")}`);
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
