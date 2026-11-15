import "server-only";
import { randomInt, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { estadoVotacion, obtenerProceso } from "./proceso";
import { generarConstancia, sha256 } from "./tokens";

export class VotoError extends Error {
  constructor(
    public codigo: "ELECCION_CERRADA" | "CEDULA_INVALIDA" | "TOKEN_NO_DISPONIBLE",
    mensaje: string,
  ) {
    super(mensaje);
  }
}

/** Mezcla Fisher-Yates para que el orden de inserción no revele nada. */
function mezclar<T>(lista: T[]): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Emite el voto de forma atómica:
 *  1. Marca el token como USADO solo si sigue PENDIENTE (bloqueo de fila en PostgreSQL:
 *     de dos peticiones simultáneas solo una puede ganar).
 *  2. Crea el RegistroParticipacion (votanteId @unique como segunda barrera).
 *  3. Inserta los votos SIN ningún vínculo con el votante.
 * Si cualquier paso falla, no se guarda nada.
 */
export async function emitirVoto(votanteId: string, selecciones: Record<string, string[]>, ip: string) {
  const proceso = await obtenerProceso();
  if (!proceso || !estadoVotacion(proceso).abierta) {
    throw new VotoError("ELECCION_CERRADA", "La votación no está abierta en este momento.");
  }

  const cargos = await prisma.cargo.findMany({
    where: { procesoId: proceso.id },
    select: { id: true, nombre: true, maxSelecciones: true, candidatos: { select: { id: true } } },
  });

  // La cédula debe traer de 1 a `maxSelecciones` candidatos válidos y distintos por cada cargo.
  if (Object.keys(selecciones).length !== cargos.length) {
    throw new VotoError("CEDULA_INVALIDA", "Debes elegir al menos un candidato en cada cargo.");
  }
  const votos = cargos.flatMap((cargo) => {
    const elegidos = selecciones[cargo.id] ?? [];
    if (elegidos.length === 0 || new Set(elegidos).size !== elegidos.length) {
      throw new VotoError("CEDULA_INVALIDA", `Revisa tu selección en ${cargo.nombre}.`);
    }
    if (elegidos.length > cargo.maxSelecciones) {
      throw new VotoError("CEDULA_INVALIDA", `En ${cargo.nombre} puedes elegir como máximo ${cargo.maxSelecciones}.`);
    }
    if (!elegidos.every((id) => cargo.candidatos.some((c) => c.id === id))) {
      throw new VotoError("CEDULA_INVALIDA", "La cédula contiene una selección no válida.");
    }
    return elegidos.map((candidatoId) => ({ cargoId: cargo.id, candidatoId }));
  });

  // La hora del voto se trunca a la hora en punto y el id es aleatorio (no un cuid,
  // que contiene marca de tiempo), así no se puede cruzar con RegistroParticipacion.
  const horaTruncada = new Date();
  horaTruncada.setMinutes(0, 0, 0);
  const constancia = generarConstancia();
  const ahora = new Date();

  try {
    await prisma.$transaction(async (tx) => {
      const token = await tx.tokenAcceso.updateMany({
        where: { votanteId, estado: "PENDIENTE" },
        data: { estado: "USADO", fechaUso: ahora, ipUso: ip },
      });
      if (token.count !== 1) {
        throw new VotoError("TOKEN_NO_DISPONIBLE", "Este token ya fue utilizado o fue anulado.");
      }

      await tx.registroParticipacion.create({
        data: { votanteId, fechaSufragio: ahora, constanciaHash: sha256(constancia) },
      });

      await tx.voto.createMany({
        data: mezclar(votos).map((v) => ({
          id: randomUUID(),
          procesoId: proceso.id,
          cargoId: v.cargoId,
          candidatoId: v.candidatoId,
          fechaEmision: horaTruncada,
        })),
      });

      await tx.auditoriaLog.create({
        data: { procesoId: proceso.id, evento: "VOTO_EMITIDO", descripcion: "Se registró un sufragio.", ip },
      });
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new VotoError("TOKEN_NO_DISPONIBLE", "Este votante ya registró su voto.");
    }
    throw e;
  }

  return { constancia, fecha: ahora };
}
