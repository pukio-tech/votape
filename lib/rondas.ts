// Elección por rondas con preferencias ordenadas (ej. Primer, Segundo y Tercer Asesor).
//
// Cada papeleta es la lista de candidatos en orden de preferencia. En cada ronda, el voto de
// cada papeleta cuenta para su preferencia más alta que todavía no haya sido elegida; gana quien
// tenga más votos y queda fuera de las rondas siguientes. Así, en cada puesto cuentan todos los
// votos. Si hay empate en el primer lugar de una ronda, el conteo se detiene ahí para que el
// comité lo resuelva.

export type Ronda = {
  puesto: number;
  votos: Record<string, number>;
  total: number;
  ganadorId: string | null;
  empatados: string[];
};

/** Cuántas preferencias debe marcar cada votante en un cargo por rondas. */
export function preferenciasRequeridas(puestos: number, candidatos: number): number {
  return Math.min(puestos, candidatos);
}

export function contarPorRondas(papeletas: string[][], candidatos: string[], puestos: number): Ronda[] {
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

    const maximo = Math.max(0, ...Object.values(votos));
    const empatados = maximo > 0 ? enCarrera.filter((id) => votos[id] === maximo) : [];
    const ganadorId = empatados.length === 1 ? empatados[0] : null;
    rondas.push({ puesto, votos, total, ganadorId, empatados: empatados.length > 1 ? empatados : [] });

    if (!ganadorId) break; // sin votos o con empate: las rondas siguientes dependen de cómo se resuelva
    elegidos.add(ganadorId);
  }
  return rondas;
}
