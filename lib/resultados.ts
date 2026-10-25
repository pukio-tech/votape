import "server-only";
import { prisma } from "./prisma";
import { obtenerProceso } from "./proceso";

export type Resultados = NonNullable<Awaited<ReturnType<typeof calcularResultados>>>;

/**
 * Resultados agregados del proceso. Solo contiene conteos por candidato y la participación
 * global: es seguro exponerlo en la vista pública.
 */
export async function calcularResultados() {
  const proceso = await obtenerProceso();
  if (!proceso) return null;

  const [cargos, conteo, totalPadron, totalVotaron] = await Promise.all([
    prisma.cargo.findMany({
      where: { procesoId: proceso.id },
      orderBy: { orden: "asc" },
      select: { id: true, nombre: true, candidatos: { select: { id: true, nombreCompleto: true, fotoUrl: true } } },
    }),
    prisma.voto.groupBy({ by: ["candidatoId"], where: { procesoId: proceso.id }, _count: { _all: true } }),
    prisma.votante.count(),
    prisma.registroParticipacion.count(),
  ]);

  const votosPor = new Map(conteo.map((c) => [c.candidatoId, c._count._all]));
  const pct = (parte: number, total: number) => (total === 0 ? 0 : Math.round((parte / total) * 100_000) / 1000);

  return {
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
        total,
        candidatos: cargo.candidatos
          .map((c) => ({ ...c, votos: votosPor.get(c.id) ?? 0, porcentaje: pct(votosPor.get(c.id) ?? 0, total) }))
          .sort((a, b) => b.votos - a.votos || a.nombreCompleto.localeCompare(b.nombreCompleto)),
      };
    }),
    actualizado: new Date().toISOString(),
  };
}
