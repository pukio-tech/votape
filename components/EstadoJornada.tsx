"use client";

import { useSyncExternalStore } from "react";

function suscribir(aviso: () => void) {
  const id = setInterval(aviso, 15_000);
  return () => clearInterval(id);
}

// Redondeado al cuarto de minuto para que el snapshot sea estable entre renders.
const ahora = () => Math.floor(Date.now() / 15_000) * 15_000;

function duracion(ms: number): string {
  const min = Math.max(1, Math.round(ms / 60_000));
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  if (d > 0) return `${d} d ${h} h`;
  if (h > 0) return `${h} h ${m} min`;
  return `${m} min`;
}

export type FaseJornada = "ABIERTA" | "NO_INICIADA" | "CERRADA" | "SIN_PROCESO";

/** Píldora con el estado de la votación y la cuenta regresiva a la apertura o al cierre. */
export function EstadoJornada({ fase, inicio, cierre }: { fase: FaseJornada; inicio?: string; cierre?: string }) {
  const t = useSyncExternalStore(suscribir, ahora, () => null);

  let texto = "Sin proceso configurado";
  let estilo = "bg-white/10 text-marca-100 ring-white/20";
  let pulso = false;

  if (fase === "ABIERTA") {
    texto = t && cierre ? `Votación abierta · cierra en ${duracion(Date.parse(cierre) - t)}` : "Votación abierta";
    estilo = "bg-emerald-400/15 text-emerald-200 ring-emerald-300/30";
    pulso = true;
  } else if (fase === "NO_INICIADA") {
    texto = t && inicio && Date.parse(inicio) > t ? `Abre en ${duracion(Date.parse(inicio) - t)}` : "Aún no inicia";
    estilo = "bg-amber-400/15 text-amber-200 ring-amber-300/30";
  } else if (fase === "CERRADA") {
    texto = "Votación cerrada";
    estilo = "bg-red-400/15 text-red-200 ring-red-300/30";
  }

  return (
    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-inset ${estilo}`}>
      <span className="relative flex size-2">
        {pulso && <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-75" />}
        <span className="relative inline-flex size-2 rounded-full bg-current" />
      </span>
      {texto}
    </span>
  );
}
