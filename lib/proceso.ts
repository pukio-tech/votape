import "server-only";
import type { ProcesoElectoral } from "@prisma/client";
import { prisma } from "./prisma";

/** El sistema maneja un único proceso electoral: el más reciente. */
export function obtenerProceso() {
  return prisma.procesoElectoral.findFirst({ orderBy: { createdAt: "desc" } });
}

export type EstadoVotacion =
  | { abierta: true }
  | { abierta: false; motivo: "SIN_PROCESO" | "NO_INICIADA" | "CERRADA" };

export function estadoVotacion(proceso: ProcesoElectoral | null, ahora = new Date()): EstadoVotacion {
  if (!proceso) return { abierta: false, motivo: "SIN_PROCESO" };
  if (proceso.estado === "FINALIZADO" || ahora > proceso.fechaCierre) return { abierta: false, motivo: "CERRADA" };
  if (proceso.estado === "CONFIGURACION" || ahora < proceso.fechaInicio) return { abierta: false, motivo: "NO_INICIADA" };
  return { abierta: true };
}

export async function registrarLog(evento: string, descripcion: string, ip?: string, procesoId?: string | null) {
  await prisma.auditoriaLog.create({ data: { evento, descripcion, ip, procesoId: procesoId ?? null } });
}
