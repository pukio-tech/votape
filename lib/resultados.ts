import "server-only";
import { prisma } from "./prisma";
import { estadoVotacion, obtenerProceso } from "./proceso";

export type Resultados = NonNullable<Awaited<ReturnType<typeof calcularResultados>>>;

/**
 * Resultados agregados del proceso: conteos por candidato y participación global.
 * Los conteos solo se incluyen cuando la votación terminó (finalizada o pasada la hora de
 * cierre); antes, `cargos` va vacío para que nadie, ni el público ni el comité, vea
 * resultados parciales. La participación sí se muestra siempre.
 */
export async function calcularResultados() {
  const proceso = await obtenerProceso();
  if (!proceso) return null;

  const estado = estadoVotacion(proceso);
  const publicados = !estado.abierta && estado.motivo === "CERRADA";

  const [cargos, conteo, totalPadron, totalVotaron] = await Promise.all([
    publicados
      ? prisma.cargo.findMany({
          where: { procesoId: proceso.id },
          orderBy: { orden: "asc" },
          select: { id: true, nombre: true, maxSelecciones: true, candidatos: { select: { id: true, nombreCompleto: true, fotoUrl: true } } },
        })
      : Promise.resolve([]),
    publicados ? prisma.voto.groupBy({ by: ["candidatoId"], where: { procesoId: proceso.id }, _count: { _all: true } }) : Promise.resolve([]),
    prisma.votante.count(),
    prisma.registroParticipacion.count(),
  ]);

  const votosPor = new Map(conteo.map((c) => [c.candidatoId, c._count._all]));
  const pct = (parte: number, total: number) => (total === 0 ? 0 : Math.round((parte / total) * 100_000) / 1000);

  return {
    publicados,
    proceso: {
      titulo: proceso.titulo,
      institucion: proceso.institucion,
      estado: proceso.estado,
      fechaInicio: proceso.fechaInicio.toISOString(),
      fechaCierre: proceso.fechaCierre.toISOString(),
    },
    participacion: {
      padron: totalPadron,
      votaron: totalVotaron,
      faltan: Math.max(totalPadron - totalVotaron, 0),
      porcentaje: pct(totalVotaron, totalPadron),
    },
    cargos: cargos.map((cargo) => {
      const total = cargo.candidatos.reduce((s, c) => s + (votosPor.get(c.id) ?? 0), 0);
      return {
        id: cargo.id,
        nombre: cargo.nombre,
        maxSelecciones: cargo.maxSelecciones,
        total,
        candidatos: cargo.candidatos
          .map((c) => ({ ...c, votos: votosPor.get(c.id) ?? 0, porcentaje: pct(votosPor.get(c.id) ?? 0, total) }))
          .sort((a, b) => b.votos - a.votos || a.nombreCompleto.localeCompare(b.nombreCompleto)),
      };
    }),
    actualizado: new Date().toISOString(),
  };
}
