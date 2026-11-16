// Elección por rondas con preferencias ordenadas (ej. Primer, Segundo y Tercer Asesor).
//
// Cada papeleta es la lista de candidatos en orden de preferencia. En cada ronda, el voto de
// cada papeleta cuenta para su preferencia más alta que todavía no haya sido elegida; gana quien
// tenga más votos y queda fuera de las rondas siguientes. Así, en cada puesto cuentan todos los
// votos.
//
// Empates en el primer lugar de una ronda:
//  1. Automático: gana quien más veces fue 2.ª preferencia; si sigue el empate, 3.ª, y así.
//  2. Si aún persiste, vale la decisión registrada por el comité para ese puesto.
//  3. Sin decisión, el conteo se detiene ahí (las rondas siguientes dependen de cómo se resuelva).

export type Criterio = "votos" | "preferencias" | "comite";

export type Ronda = {
  puesto: number;
  votos: Record<string, number>;
  total: number;
  ganadorId: string | null;
  /** Candidatos empatados en el primer lugar (aunque el empate se haya resuelto). */
  empatados: string[];
  /** Cómo se decidió el ganador; null si quedó empate sin resolver o no hubo votos. */
  criterio: Criterio | null;
};

/** Cuántas preferencias debe marcar cada votante en un cargo por rondas. */
export function preferenciasRequeridas(puestos: number, candidatos: number): number {
  return Math.min(puestos, candidatos);
}

/** Quién gana entre los empatados: más veces en 2.ª preferencia, luego 3.ª, etc. */
function desempatePorPreferencias(empatados: string[], papeletas: string[][]): string[] {
  let quedan = empatados;
  const niveles = Math.max(0, ...papeletas.map((p) => p.length));
  for (let nivel = 1; nivel < niveles && quedan.length > 1; nivel++) {
    const veces = new Map(quedan.map((id) => [id, papeletas.filter((p) => p[nivel] === id).length]));
    const maximo = Math.max(...veces.values());
    quedan = quedan.filter((id) => veces.get(id) === maximo);
  }
  return quedan;
}

/**
 * Decide el primer lugar de un conteo. `porPreferencias` aplica el desempate automático
 * (solo tiene sentido con papeletas ordenadas); `decision` es lo que registró el comité.
 */
export function decidirGanador(
  votos: Record<string, number>,
  opciones: { papeletas?: string[][]; decision?: string },
): Pick<Ronda, "ganadorId" | "empatados" | "criterio"> {
  const maximo = Math.max(0, ...Object.values(votos));
  if (maximo === 0) return { ganadorId: null, empatados: [], criterio: null };
  const empatados = Object.keys(votos).filter((id) => votos[id] === maximo);
  if (empatados.length === 1) return { ganadorId: empatados[0], empatados: [], criterio: "votos" };

  if (opciones.papeletas) {
    const quedan = desempatePorPreferencias(empatados, opciones.papeletas);
    if (quedan.length === 1) return { ganadorId: quedan[0], empatados, criterio: "preferencias" };
  }
  if (opciones.decision && empatados.includes(opciones.decision)) {
    return { ganadorId: opciones.decision, empatados, criterio: "comite" };
  }
  return { ganadorId: null, empatados, criterio: null };
}

/** `decisiones`: puesto → candidato elegido por el comité para los empates que no se resuelven solos. */
export function contarPorRondas(
  papeletas: string[][],
  candidatos: string[],
  puestos: number,
  decisiones: Record<number, string> = {},
): Ronda[] {
  const rondas: Ronda[] = [];
  const elegidos = new Set<string>();

  for (let puesto = 1; puesto <= Math.min(puestos, candidatos.length); puesto++) {
    const enCarrera = candidatos.filter((id) => !elegidos.has(id));
    const votos: Record<string, number> = Object.fromEntries(enCarrera.map((id) => [id, 0]));
    let total = 0;
    for (const papeleta of papeletas) {
      const preferido = papeleta.find((id) => id in votos);
      if (preferido) {
        votos[preferido]++;
        total++;
      }
    }

    const decision = decidirGanador(votos, { papeletas, decision: decisiones[puesto] });
    rondas.push({ puesto, votos, total, ...decision });

    if (!decision.ganadorId) break; // sin votos o con empate sin resolver
    elegidos.add(decision.ganadorId);
  }
  return rondas;
}
