import "server-only";
import { prisma } from "./prisma";
import { estadoVotacion, obtenerProceso } from "./proceso";
import { contarPorRondas } from "./rondas";

export type Resultados = NonNullable<Awaited<ReturnType<typeof calcularResultados>>>;

const pct = (parte: number, total: number) => (total === 0 ? 0 : Math.round((parte / total) * 100_000) / 1000);

type CandidatoBase = { id: string; nombreCompleto: string; fotoUrl: string | null };

/** Candidatos con sus votos y porcentaje, del más al menos votado. */
function tabla(candidatos: CandidatoBase[], votosPor: (id: string) => number) {
  const total = candidatos.reduce((s, c) => s + votosPor(c.id), 0);
  return {
    total,
    candidatos: candidatos
      .map((c) => ({ ...c, votos: votosPor(c.id), porcentaje: pct(votosPor(c.id), total) }))
      .sort((a, b) => b.votos - a.votos || a.nombreCompleto.localeCompare(b.nombreCompleto)),
  };
}

/**
 * Resultados agregados del proceso: conteos por candidato y participación global.
 * Los conteos solo se incluyen cuando la votación terminó (finalizada o pasada la hora de
 * cierre); antes, `cargos` va vacío para que nadie, ni el público ni el comité, vea
 * resultados parciales. La participación sí se muestra siempre.
 * Los cargos con varios puestos (maxSelecciones > 1) se cuentan por rondas: ver lib/rondas.ts.
 */
export async function calcularResultados() {
  const proceso = await obtenerProceso();
  if (!proceso) return null;

  const estado = estadoVotacion(proceso);
  const publicados = !estado.abierta && estado.motivo === "CERRADA";

  const [cargos, conteo, preferencias, totalPadron, totalVotaron] = await Promise.all([
    publicados
      ? prisma.cargo.findMany({
          where: { procesoId: proceso.id },
          orderBy: { orden: "asc" },
          select: { id: true, nombre: true, maxSelecciones: true, candidatos: { select: { id: true, nombreCompleto: true, fotoUrl: true } } },
        })
      : Promise.resolve([]),
    publicados ? prisma.voto.groupBy({ by: ["candidatoId"], where: { procesoId: proceso.id }, _count: { _all: true } }) : Promise.resolve([]),
    publicados
      ? prisma.voto.findMany({
          where: { procesoId: proceso.id, cargo: { maxSelecciones: { gt: 1 } } },
          select: { id: true, cargoId: true, candidatoId: true, preferencia: true, papeleta: true },
        })
      : Promise.resolve([]),
    prisma.votante.count(),
    prisma.registroParticipacion.count(),
  ]);

  const votosPor = new Map(conteo.map((c) => [c.candidatoId, c._count._all]));

  // Arma las papeletas (preferencias en orden) de cada cargo por rondas.
  const papeletasPorCargo = new Map<string, Map<string, { candidatoId: string; preferencia: number }[]>>();
  for (const v of preferencias) {
    const porPapeleta = papeletasPorCargo.get(v.cargoId) ?? new Map();
    const clave = v.papeleta ?? v.id;
    porPapeleta.set(clave, [...(porPapeleta.get(clave) ?? []), { candidatoId: v.candidatoId, preferencia: v.preferencia ?? 1 }]);
    papeletasPorCargo.set(v.cargoId, porPapeleta);
  }

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
      if (cargo.maxSelecciones <= 1) {
        return { id: cargo.id, nombre: cargo.nombre, maxSelecciones: cargo.maxSelecciones, ...tabla(cargo.candidatos, (id) => votosPor.get(id) ?? 0), rondas: null };
      }
      const papeletas = [...(papeletasPorCargo.get(cargo.id)?.values() ?? [])].map((p) =>
        p.sort((a, b) => a.preferencia - b.preferencia).map((x) => x.candidatoId),
      );
      const rondas = contarPorRondas(
        papeletas,
        cargo.candidatos.map((c) => c.id),
        cargo.maxSelecciones,
      ).map((r) => ({
        puesto: r.puesto,
        ganadorId: r.ganadorId,
        empatados: r.empatados,
        ...tabla(
          cargo.candidatos.filter((c) => c.id in r.votos),
          (id) => r.votos[id] ?? 0,
        ),
      }));
      // Tabla principal = 1.ª ronda (primeras preferencias).
      return {
        id: cargo.id,
        nombre: cargo.nombre,
        maxSelecciones: cargo.maxSelecciones,
        ...(rondas[0] ? { total: rondas[0].total, candidatos: rondas[0].candidatos } : tabla(cargo.candidatos, () => 0)),
        rondas,
      };
    }),
    actualizado: new Date().toISOString(),
  };
}
