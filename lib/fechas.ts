// Perú no aplica horario de verano: UTC-5 todo el año.
export const ZONA_HORARIA = "America/Lima";
const OFFSET = "-05:00";

export function formatearFecha(fecha: Date | string): string {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: ZONA_HORARIA,
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(fecha));
}

export function formatearHora(fecha: Date | string): string {
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: ZONA_HORARIA,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(fecha));
}

/** ISO → valor para <input type="datetime-local"> en hora de Lima. */
export function aInputLocal(fecha: Date | string): string {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: ZONA_HORARIA,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(fecha))
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

/** Valor de <input type="datetime-local"> (hora de Lima) → Date. */
export function desdeInputLocal(valor: string): Date {
  return new Date(`${valor}:00${OFFSET}`);
}

/** "25/10/2026 a las 11:55:25 a. m." */
export function formatearActualizado(fecha: Date | string): string {
  const d = new Date(fecha);
  const dia = new Intl.DateTimeFormat("es-PE", { timeZone: ZONA_HORARIA, day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
  return `${dia} a las ${formatearHora(d)}`;
}
