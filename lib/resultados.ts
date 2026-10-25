import "server-only";
import { prisma } from "./prisma";
import { obtenerProceso } from "./proceso";

export type Resultados = NonNullable<Awaited<ReturnType<typeof calcularResultados>>>;

export async function calcularResultados() {
  const proceso = await obtenerProceso();
  if (!proceso) return null;

  const [cargos, conteo, totalPadron, totalVotaron, tokens, logs] = await Promise.all([
    prisma.cargo.findMany({
      where: { procesoId: proceso.id },
      orderBy: { orden: "asc" },
      select: { id: true, nombre: true, candidatos: { select: { id: true, nombreCompleto: true, fotoUrl: true } } },
    }),
    prisma.voto.groupBy({ by: ["candidatoId"], where: { procesoId: proceso.id }, _count: { _all: true } }),
    prisma.votante.count(),
    prisma.registroParticipacion.count(),
    prisma.tokenAcceso.groupBy({ by: ["estado"], _count: { _all: true } }),
    prisma.auditoriaLog.findMany({ orderBy: { createdAt: "desc" }, take: 12 }),
  ]);

  const votosPor = new Map(conteo.map((c) => [c.candidatoId, c._count._all]));
  const pct = (parte: number, total: number) => (total === 0 ? 0 : Math.round((parte / total) * 1000) / 10);
  const porEstado = Object.fromEntries(tokens.map((t) => [t.estado, t._count._all]));

  return {
    proceso: {
      id: proceso.id,
      titulo: proceso.titulo,
      institucion: proceso.institucion,
      estado: proceso.estado,
      fechaInicio: proceso.fechaInicio.toISOString(),
      fechaCierre: proceso.fechaCierre.toISOString(),
    },
    participacion: {
      padron: totalPadron,
      votaron: totalVotaron,
      porcentaje: pct(totalVotaron, totalPadron),
      pendientes: porEstado.PENDIENTE ?? 0,
      anulados: porEstado.ANULADO ?? 0,
    },
    cargos: cargos.map((cargo) => {
      const total = cargo.candidatos.reduce((s, c) => s + (votosPor.get(c.id) ?? 0), 0);
      return {
        id: cargo.id,
        nombre: cargo.nombre,
        total,
        candidatos: cargo.candidatos
          .map((c) => ({ ...c, votos: votosPor.get(c.id) ?? 0, porcentaje: pct(votosPor.get(c.id) ?? 0, total) }))
          .sort((a, b) => b.votos - a.votos),
      };
    }),
    logs: logs.map((l) => ({ id: l.id, evento: l.evento, descripcion: l.descripcion, createdAt: l.createdAt.toISOString() })),
    actualizado: new Date().toISOString(),
  };
}
