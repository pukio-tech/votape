"use client";

import { ChevronLeft, ChevronRight, Crown, Landmark, Lock, WifiOff } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { formatearActualizado, formatearFecha } from "@/lib/fechas";
import type { Resultados } from "@/lib/resultados";

const ALTO_GRAFICO = 300; // px del área de barras
const ANCHO_COLUMNA = 128; // px por candidato al desplazar con las flechas

const num = (n: number) => n.toLocaleString("es-PE");
const pct = (n: number) => `${n.toFixed(3)} %`;

/** Escala "redonda" para el eje Y: 0 … tope en ~5 pasos. */
function escala(max: number) {
  if (max <= 0) return { tope: 5, paso: 1 };
  const bruto = max / 5;
  const magnitud = 10 ** Math.floor(Math.log10(bruto));
  const n = bruto / magnitud;
  const paso = Math.max(1, Math.ceil((n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * magnitud));
  return { tope: Math.ceil(max / paso) * paso, paso };
}

export function TableroResultados({ inicial, intervaloMs = 10_000 }: { inicial: Resultados; intervaloMs?: number }) {
  const [datos, setDatos] = useState(inicial);
  const [conectado, setConectado] = useState(true);
  const [cargoId, setCargoId] = useState(inicial.cargos[0]?.id ?? "");

  const actualizar = useCallback(async () => {
    try {
      const res = await fetch("/api/resultados", { cache: "no-store" });
      if (!res.ok) throw new Error();
      setDatos(await res.json());
      setConectado(true);
    } catch {
      setConectado(false);
    }
  }, []);

  useEffect(() => {
    const id = setInterval(actualizar, intervaloMs);
    return () => clearInterval(id);
  }, [actualizar, intervaloMs]);

  const cargo = datos.cargos.find((c) => c.id === cargoId) ?? datos.cargos[0];
  const { participacion: p } = datos;

  return (
    <div className="space-y-6">
      {/* Resumen de participación */}
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-6" aria-label="Participación">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:gap-8">
          <div>
            <p className="text-sm font-medium text-marca-600">Participación del padrón</p>
            <p className="text-4xl font-bold tabular-nums tracking-tight text-marca-900 sm:text-5xl">{pct(p.porcentaje)}</p>
          </div>
          <div className="sm:pb-1">
            <p className="text-lg font-bold text-marca-950">Total de votos emitidos: {num(p.votaron)}</p>
            <p className="text-sm text-marca-600">
              de {num(p.padron)} electores habilitados · faltan {num(p.faltan)}
            </p>
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-marca-100" role="progressbar" aria-valuenow={p.porcentaje} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-marca-800 transition-[width] duration-700 ease-out" style={{ width: `${p.porcentaje}%` }} />
        </div>
        <div className="mt-3 flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p className={`flex items-center gap-2 font-semibold uppercase tracking-wide ${conectado ? "text-slate-600" : "text-red-600"}`}>
            {conectado ? (
              <span className="relative flex size-2">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
            ) : (
              <WifiOff className="size-3.5" aria-hidden />
            )}
            {conectado ? `Actualizado al ${formatearActualizado(datos.actualizado)}` : "Sin conexión, reintentando"}
          </p>
          <div className="flex items-center gap-4 text-sm text-marca-800">
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-marca-800" aria-hidden /> Votaron ({num(p.votaron)})
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-3 rounded-full bg-marca-100 ring-1 ring-marca-200" aria-hidden /> Faltan ({num(p.faltan)})
            </span>
          </div>
        </div>
      </section>

      {!datos.publicados && (
        <section className="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200/80 sm:p-10" aria-live="polite">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-acento-100 text-acento-800">
            <Lock className="size-7" aria-hidden />
          </div>
          <h3 className="mt-4 text-lg font-bold text-marca-950">Los resultados se publicarán al cierre de la votación</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
            Para no influir en quienes aún no votan, el conteo se muestra cuando termina la jornada
            {datos.proceso.estado === "FINALIZADO" ? "" : ` (cierre: ${formatearFecha(datos.proceso.fechaCierre)})`}. Esta página se
            actualizará sola.
          </p>
        </section>
      )}

      {/* Filtro por cargo */}
      <div className={`flex flex-col gap-3 sm:flex-row sm:items-center ${datos.publicados ? "" : "hidden"}`}>
        <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-marca-900">
          <Landmark className="size-5 text-marca-600" aria-hidden /> Cargo
        </span>
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist" aria-label="Filtrar por cargo">
          {datos.cargos.map((c) => {
            const activo = c.id === cargo?.id;
            return (
              <button
                key={c.id}
                role="tab"
                aria-selected={activo}
                onClick={() => setCargoId(c.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activo ? "bg-marca-800 text-white shadow-sm" : "bg-white text-marca-700 ring-1 ring-inset ring-slate-300 hover:ring-marca-300"
                }`}
              >
                {c.nombre}
              </button>
            );
          })}
        </div>
      </div>

      {cargo && (cargo.rondas ? <CargoPorRondas key={cargo.id} cargo={cargo} /> : <GraficoCargo key={cargo.id} cargo={cargo} />)}
    </div>
  );
}

type Cargo = Resultados["cargos"][number];

const ORDINALES = ["Primer", "Segundo", "Tercer", "Cuarto", "Quinto", "Sexto", "Séptimo", "Octavo", "Noveno", "Décimo"];

/** "Asesores" → "Asesor": nombre del puesto a partir del cargo. */
function puesto(cargo: string, n: number) {
  const singular = cargo.endsWith("es") ? cargo.slice(0, -2) : cargo.endsWith("s") ? cargo.slice(0, -1) : cargo;
  return `${ORDINALES[n - 1] ?? `${n}.º`} ${singular}`;
}

/**
 * Cargo por rondas (ej. Asesores): cada puesto se decide con todos los votos, quitando a los ya
 * elegidos. Muestra el ganador de cada puesto y el gráfico de cada ronda.
 */
function CargoPorRondas({ cargo }: { cargo: Cargo }) {
  const rondas = cargo.rondas ?? [];
  const [activa, setActiva] = useState(0);
  const nombrePor = new Map(cargo.candidatos.map((c) => [c.id, c]));
  const ronda = rondas[activa];

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200/80 sm:p-6" aria-label={`Elegidos en ${cargo.nombre}`}>
        <h3 className="text-lg font-bold text-marca-950">{cargo.nombre}</h3>
        <p className="mt-1 text-sm text-slate-600">
          Se elige por rondas: en cada puesto cuentan los votos de todos; quien eligió a alguien ya electo pasa a su siguiente preferencia.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {Array.from({ length: cargo.maxSelecciones }, (_, i) => {
            const r = rondas[i];
            const ganador = r?.ganadorId ? r.candidatos.find((c) => c.id === r.ganadorId) : null;
            return (
              <div key={i} className={`rounded-xl p-4 ring-1 ring-inset ${ganador ? "bg-marca-50 ring-marca-200" : "bg-slate-50 ring-slate-200"}`}>
                <p className="text-xs font-semibold uppercase tracking-wider text-acento-700">{puesto(cargo.nombre, i + 1)}</p>
                {ganador ? (
                  <div className="mt-2 flex items-center gap-3">
                    <Foto url={ganador.fotoUrl} nombre={ganador.nombreCompleto} destacado />
                    <div className="min-w-0">
                      <p className="font-bold leading-snug text-marca-950">{ganador.nombreCompleto}</p>
                      <p className="text-sm tabular-nums text-slate-600">
                        {num(ganador.votos)} de {num(r.total)} votos · {pct(ganador.porcentaje)}
                      </p>
                    </div>
                  </div>
                ) : r?.empatados.length ? (
                  <p className="mt-2 text-sm font-medium text-amber-800">
                    Empate entre {r.empatados.map((id) => nombrePor.get(id)?.nombreCompleto ?? "—").join(" y ")}. Lo define el comité.
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">{rondas.length && i >= rondas.length ? "Pendiente del empate anterior." : "Sin votos."}</p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {rondas.length > 0 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0" role="tablist" aria-label="Rondas">
          {rondas.map((r, i) => (
            <button
              key={r.puesto}
              role="tab"
              aria-selected={i === activa}
              onClick={() => setActiva(i)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                i === activa ? "bg-marca-800 text-white shadow-sm" : "bg-white text-marca-700 ring-1 ring-inset ring-slate-300 hover:ring-marca-300"
              }`}
            >
              Ronda {r.puesto}: {puesto(cargo.nombre, r.puesto)}
            </button>
          ))}
        </div>
      )}
      {ronda && (
        <GraficoCargo
          key={`${cargo.id}-${ronda.puesto}`}
          cargo={{ ...cargo, nombre: `${puesto(cargo.nombre, ronda.puesto)} · ronda ${ronda.puesto}`, maxSelecciones: 1, total: ronda.total, candidatos: ronda.candidatos, rondas: null }}
        />
      )}
    </div>
  );
}

function GraficoCargo({ cargo }: { cargo: Cargo }) {
  const desplazable = useRef<HTMLDivElement>(null);
  const { tope, paso } = escala(Math.max(...cargo.candidatos.map((c) => c.votos), 0));
  const marcas = Array.from({ length: tope / paso + 1 }, (_, i) => i * paso);
  // Quedan elegidos los N más votados (N = maxSelecciones; 1 en la mayoría de cargos). Si hay empate justo
  // en el último puesto, nadie del empate se marca como elegido y se muestra el aviso.
  const n = cargo.maxSelecciones;
  const umbral = cargo.candidatos[n]?.votos ?? -1;
  const elegido = (i: number) => i < n && cargo.candidatos[i].votos > 0 && cargo.candidatos[i].votos > umbral;
  const empateEnCorte = (cargo.candidatos[n - 1]?.votos ?? 0) > 0 && cargo.candidatos[n - 1]?.votos === cargo.candidatos[n]?.votos;

  const mover = (dir: 1 | -1) => desplazable.current?.scrollBy({ left: dir * ANCHO_COLUMNA * 2, behavior: "smooth" });

  return (
    <section className="animate-aparecer rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/80 sm:p-6" aria-labelledby="titulo-grafico">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="titulo-grafico" className="text-lg font-bold text-marca-950">
          {cargo.nombre}
          {n > 1 && (
            <span className="ml-2 inline-flex rounded-full bg-acento-100 px-2.5 py-0.5 align-middle text-xs font-semibold text-acento-800">
              Se eligen {n}
            </span>
          )}
        </h3>
        <p className="text-sm text-slate-500">
          {num(cargo.total)} {cargo.total === 1 ? "voto válido" : "votos válidos"}
        </p>
      </div>
      {n > 1 && (
        <p className="mt-1 text-xs text-slate-500">
          Cada votante marca hasta {n}; los porcentajes se calculan sobre el total de marcas del cargo.
        </p>
      )}
      {empateEnCorte && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 ring-1 ring-inset ring-amber-200">
          {n === 1 ? "Empate en el primer lugar." : `Empate en el puesto ${n}: el último lugar elegido aún no está definido.`}
        </p>
      )}

      <div className="relative mt-2 flex">
        {/* Eje Y */}
        <div className="relative w-9 shrink-0 sm:w-16" style={{ height: ALTO_GRAFICO, marginTop: 112 }} aria-hidden>
          {marcas.map((m) => (
            <span
              key={m}
              className="absolute right-1.5 translate-y-1/2 text-[11px] tabular-nums text-slate-500 sm:text-xs"
              style={{ bottom: `${(m / tope) * 100}%` }}
            >
              {num(m)}
            </span>
          ))}
        </div>

        <div ref={desplazable} className="min-w-0 flex-1 overflow-x-auto scroll-smooth [--col:84px] sm:[--col:128px]">
          <div style={{ minWidth: `calc(${cargo.candidatos.length} * var(--col))` }}>
            {/* Área de barras (con espacio arriba para foto y porcentaje) */}
            <div className="pt-28">
              <div className="relative border-l border-slate-200" style={{ height: ALTO_GRAFICO }}>
                {marcas.map((m) => (
                  <span
                    key={m}
                    className={`absolute inset-x-0 border-t ${m === 0 ? "border-slate-300" : "border-dashed border-slate-200"}`}
                    style={{ bottom: `${(m / tope) * 100}%` }}
                    aria-hidden
                  />
                ))}
                <ul className="relative flex h-full items-end">
                  {cargo.candidatos.map((c, i) => {
                    const destacado = elegido(i);
                    return (
                      <li key={c.id} className="flex h-full flex-1 flex-col items-center justify-end px-1.5 sm:px-4" title={`${c.nombreCompleto}: ${num(c.votos)} votos`}>
                        <div className="mb-2 flex flex-col items-center">
                          <Foto url={c.fotoUrl} nombre={c.nombreCompleto} destacado={destacado} />
                          <span className={`mt-1.5 flex items-center gap-1 whitespace-nowrap text-[13px] font-bold tabular-nums sm:text-lg text-marca-700`}>
                            {destacado && <Crown className="size-3.5 sm:size-4" aria-label={n > 1 ? "Elegido" : "Lidera"} />}
                            {pct(c.porcentaje)}
                          </span>
                        </div>
                        <div
                          className={`w-full max-w-36 shrink-0 rounded-t-xl transition-[height] duration-700 ease-out ${destacado ? "bg-marca-500" : "bg-acento-400"}`}
                          style={{ height: `${(c.votos / tope) * 100}%`, minHeight: c.votos > 0 ? 6 : 2 }}
                        />
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            {/* Nombres */}
            <ul className="flex border-l border-transparent pt-3">
              {cargo.candidatos.map((c) => (
                <li key={c.id} className="flex-1 px-1 text-center sm:px-4">
                  <p className="text-[11px] font-semibold uppercase leading-snug text-marca-800 sm:text-[13px]">{c.nombreCompleto}</p>
                  <p className="mt-0.5 text-xs tabular-nums text-slate-500">{num(c.votos)} votos</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {cargo.candidatos.length > 3 && (
          <>
            <button
              type="button"
              onClick={() => mover(-1)}
              aria-label="Ver candidatos anteriores"
              className="absolute left-9 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white text-marca-700 shadow-md ring-1 ring-slate-200 sm:left-16"
            >
              <ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={() => mover(1)}
              aria-label="Ver más candidatos"
              className="absolute right-0 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white text-marca-700 shadow-md ring-1 ring-slate-200"
            >
              <ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>

      {/* Detalle en tabla */}
      <div className="mt-8">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="hidden py-2 pr-3 font-semibold sm:table-cell">#</th>
              <th className="py-2 pr-3 font-semibold">Candidato</th>
              <th className="py-2 pr-3 text-right font-semibold">Votos</th>
              <th className="py-2 text-right font-semibold">%</th>
            </tr>
          </thead>
          <tbody>
            {cargo.candidatos.map((c, i) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0">
                <td className="hidden py-2.5 pr-3 tabular-nums text-slate-400 sm:table-cell">{i + 1}</td>
                <td className="py-2.5 pr-3 font-medium text-marca-950">
                  {c.nombreCompleto}
                  {n > 1 && elegido(i) && (
                    <span className="ml-2 inline-flex rounded-full bg-marca-50 px-2 py-0.5 align-middle text-[11px] font-semibold text-marca-700 ring-1 ring-inset ring-marca-200">
                      Elegido
                    </span>
                  )}
                </td>
                <td className="py-2.5 pr-3 text-right tabular-nums text-slate-700">{num(c.votos)}</td>
                <td className="py-2.5 text-right font-semibold tabular-nums text-marca-800">{pct(c.porcentaje)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 font-bold text-marca-950">
              <td className="hidden py-2.5 pr-3 sm:table-cell" />
              <td className="py-2.5 pr-3">Total</td>
              <td className="py-2.5 pr-3 text-right tabular-nums">{num(cargo.total)}</td>
              <td className="py-2.5 text-right tabular-nums">{cargo.total > 0 ? "100.000 %" : pct(0)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
}

function Foto({ url, nombre, destacado }: { url: string | null; nombre: string; destacado: boolean }) {
  const anillo = destacado ? "ring-[3px] ring-marca-500" : "ring-1 ring-slate-200";
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" className={`size-12 rounded-xl object-cover sm:size-16 ${anillo}`} />;
  }
  const ini = nombre.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("");
  return <span className={`grid size-12 place-items-center rounded-xl bg-marca-100 text-base font-bold text-marca-700 sm:size-16 sm:text-lg ${anillo}`}>{ini}</span>;
}
