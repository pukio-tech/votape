/**
 * Carga datos de DEMOSTRACIÓN: la elección de ejemplo (abierta desde ahora y por 3 días)
 * y 30 votantes ficticios. Los tokens quedan en salida/tokens-demo.csv.
 *
 *   npm run db:seed            → solo si la BD no tiene votos registrados
 *   npm run db:seed -- --reset → borra TODO y vuelve a cargar
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";
import { crearEleccion, escribirCsv, registrarPadron, type DatosEleccion } from "../scripts/comun";

const NOMBRES = ["Ana", "Luis", "Carmen", "Jorge", "Rocío", "Miguel", "Diana", "Raúl", "Elena", "Iván"];
const APELLIDOS = ["Ramírez", "Torres", "Flores", "Vásquez", "Rengifo", "Pinchi", "Amasifuén", "Saavedra", "Del Águila", "Chávez"];

async function main() {
  const reset = process.argv.includes("--reset");
  const votosExistentes = await prisma.registroParticipacion.count();
  if (votosExistentes > 0 && !reset) {
    throw new Error(`La BD ya tiene ${votosExistentes} sufragios. Usa --reset si de verdad quieres borrar todo.`);
  }

  await prisma.$transaction([
    prisma.auditoriaLog.deleteMany(),
    prisma.voto.deleteMany(),
    prisma.registroParticipacion.deleteMany(),
    prisma.tokenAcceso.deleteMany(),
    prisma.votante.deleteMany(),
    prisma.procesoElectoral.deleteMany(),
  ]);

  const datos = JSON.parse(
    readFileSync(path.join(process.cwd(), "datos", "eleccion.ejemplo.json"), "utf8"),
  ) as DatosEleccion;
  const ahora = new Date();
  const proceso = await crearEleccion(
    {
      ...datos,
      titulo: `${datos.titulo} (DEMO)`,
      fechaInicio: new Date(ahora.getTime() - 60 * 60 * 1000).toISOString(),
      fechaCierre: new Date(ahora.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    "EN_PROCESO",
  );

  const padron = Array.from({ length: 30 }, (_, i) => ({
    codigoEstudiante: `2026${String(i + 1).padStart(6, "0")}`,
    dni: String(70000000 + i * 137),
    nombres: NOMBRES[i % NOMBRES.length],
    apellidos: `${APELLIDOS[i % APELLIDOS.length]} ${APELLIDOS[(i * 3 + 1) % APELLIDOS.length]}`,
  }));
  const tokens = await registrarPadron(padron);
  const ruta = escribirCsv("tokens-demo.csv", tokens);

  await prisma.auditoriaLog.create({
    data: { procesoId: proceso.id, evento: "SEED", descripcion: "Datos de demostración cargados." },
  });

  console.log(`✔ Elección "${proceso.titulo}" creada (EN_PROCESO).`);
  console.log(`✔ ${tokens.length} votantes con token. Archivo: ${ruta}`);
  console.log(`  Ejemplo → código ${tokens[0].codigo}  token ${tokens[0].token}`);
}

main()
  .catch((e) => {
    console.error("✖", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
