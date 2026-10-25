"use client";

import { useRouter } from "next/navigation";
import { useActionState, useCallback, useEffect, useState, useTransition } from "react";
import { cambiarEstado, guardarHorario, type Respuesta } from "@/app/admin/acciones";
import { aInputLocal, formatearFecha, formatearHora } from "@/lib/fechas";
import type { Resultados } from "@/lib/resultados";

const INTERVALO_MS = 5000;

export function PanelAdmin({ inicial }: { inicial: Resultados }) {
  const [datos, setDatos] = useState(inicial);
  const [conectado, setConectado] = useState(true);
  const router = useRouter();

  const actualizar = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/resultados", { cache: "no-store" });
      if (res.status === 401) return router.replace("/admin/login");
      if (!res.ok) throw new Error();
      setDatos(await res.json());
      setConectado(true);
    } catch {
      setConectado(false);
    }
  }, [router]);

  useEffect(() => {
    const id = setInterval(actualizar, INTERVALO_MS);
    return () => clearInterval(id);
  }, [actualizar]);

  const { participacion: p } = datos;

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <EstadoBadge proceso={datos.proceso} ahora={datos.actualizado} />
          <span className="flex items-center gap-2 text-slate-500">
            <span className={`size-2 rounded-full ${conectado ? "animate-pulse bg-emerald-500" : "bg-red-500"}`} />
            {conectado ? "En vivo" : "Sin conexión"} · actualizado {formatearHora(datos.actualizado)}
          </span>
        </div>

        {/* Indicadores */}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl bg-marca-800 p-5 text-white shadow-sm sm:col-span-2">
            <p className="text-sm text-marca-200">Participación del padrón</p>
            <p className="mt-1 text-4xl font-semibold tabular-nums">{p.porcentaje.toFixed(1)}%</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/15">
              <div className="h-full rounded-full bg-emerald-400 transition-all duration-700" style={{ width: `${p.porcentaje}%` }} />
            </div>
            <p className="mt-2 text-sm text-marca-100">
              {p.votaron.toLocaleString("es-PE")} de {p.padron.toLocaleString("es-PE")} electores han votado
            </p>
          </div>
          <Indicador etiqueta="Tokens pendientes" valor={p.pendientes} />
          <Indicador etiqueta="Tokens anulados" valor={p.anulados} />
        </section>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Resultados */}
          <section className="space-y-4 lg:col-span-2">
            <h2 className="text-lg font-semibold text-slate-900">Resultados por cargo</h2>
            {datos.cargos.map((cargo) => (
              <div key={cargo.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-semibold text-slate-900">{cargo.nombre}</h3>
                  <span className="text-sm tabular-nums text-slate-500">{cargo.total} votos</span>
                </div>
                <ul className="mt-4 space-y-3">
                  {cargo.candidatos.map((c, i) => {
                    const lider = i === 0 && c.votos > 0 && c.votos !== cargo.candidatos[1]?.votos;
                    return (
                      <li key={c.id}>
                        <div className="flex items-baseline justify-between gap-3 text-sm">
                          <span className={`truncate ${lider ? "font-semibold text-slate-900" : "text-slate-700"}`}>
                            {c.nombreCompleto}
                          </span>
                          <span className="shrink-0 tabular-nums text-slate-600">
                            <strong className="text-slate-900">{c.porcentaje.toFixed(1)}%</strong> · {c.votos}
                          </span>
                        </div>
                        <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${lider ? "bg-marca-600" : "bg-marca-200"}`}
                            style={{ width: `${c.porcentaje}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </section>

          {/* Control y auditoría */}
          <aside className="space-y-6">
            <ControlJornada datos={datos} onCambio={actualizar} />
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <h2 className="font-semibold text-slate-900">Auditoría reciente</h2>
              <ul className="mt-3 space-y-3 text-sm">
                {datos.logs.map((l) => (
                  <li key={l.id} className="border-l-2 border-slate-200 pl-3">
                    <p className="text-xs text-slate-400">
                      {formatearHora(l.createdAt)} · <span className="font-medium text-slate-500">{l.evento}</span>
                    </p>
                    <p className="text-slate-700">{l.descripcion}</p>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Indicador({ etiqueta, valor }: { etiqueta: string; valor: number }) {
  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{etiqueta}</p>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">{valor.toLocaleString("es-PE")}</p>
    </div>
  );
}

function EstadoBadge({ proceso, ahora: hora }: { proceso: Resultados["proceso"]; ahora: string }) {
  const { estado, fechaInicio: inicio, fechaCierre: cierre } = proceso;
  const ahora = Date.parse(hora);
  let texto = "En configuración";
  let estilo = "bg-slate-100 text-slate-700 ring-slate-200";
  if (estado === "FINALIZADO" || (estado === "EN_PROCESO" && ahora > Date.parse(cierre))) {
    texto = "Votación cerrada";
    estilo = "bg-red-50 text-red-700 ring-red-200";
  } else if (estado === "EN_PROCESO" && ahora < Date.parse(inicio)) {
    texto = "Activada · esperando hora de inicio";
    estilo = "bg-amber-50 text-amber-800 ring-amber-200";
  } else if (estado === "EN_PROCESO") {
    texto = "Votación abierta";
    estilo = "bg-emerald-50 text-emerald-700 ring-emerald-200";
  }
  return <span className={`rounded-full px-3 py-1 text-sm font-medium ring-1 ${estilo}`}>{texto}</span>;
}

function ControlJornada({ datos, onCambio }: { datos: Resultados; onCambio: () => void }) {
  const [horario, accionHorario, guardando] = useActionState<Respuesta, FormData>(async (prev, fd) => {
    const r = await guardarHorario(prev, fd);
    onCambio();
    return r;
  }, null);
  const [mensajeEstado, setMensajeEstado] = useState<Respuesta>(null);
  const [cambiando, startTransition] = useTransition();
  const { estado } = datos.proceso;

  function aplicar(nuevo: "CONFIGURACION" | "EN_PROCESO" | "FINALIZADO", confirmacion: string) {
    if (!window.confirm(confirmacion)) return;
    startTransition(async () => {
      setMensajeEstado(await cambiarEstado(nuevo));
      onCambio();
    });
  }

  const boton = "w-full rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-50";

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <h2 className="font-semibold text-slate-900">Control de la jornada</h2>

      <div className="mt-4 space-y-2">
        {estado !== "EN_PROCESO" && (
          <button
            disabled={cambiando}
            onClick={() =>
              aplicar(
                "EN_PROCESO",
                estado === "FINALIZADO" ? "¿Reabrir la votación?" : "¿Activar la votación? Los electores podrán votar dentro del horario.",
              )
            }
            className={`${boton} bg-emerald-600 text-white hover:bg-emerald-700`}
          >
            {estado === "FINALIZADO" ? "Reabrir votación" : "Activar votación"}
          </button>
        )}
        {estado === "EN_PROCESO" && (
          <>
            <button
              disabled={cambiando}
              onClick={() => aplicar("CONFIGURACION", "¿Pausar la votación? Nadie podrá ingresar hasta reactivarla.")}
              className={`${boton} bg-white text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50`}
            >
              Pausar votación
            </button>
            <button
              disabled={cambiando}
              onClick={() => aplicar("FINALIZADO", "¿Finalizar la votación? Se cerrará el acceso a todos los electores.")}
              className={`${boton} bg-red-600 text-white hover:bg-red-700`}
            >
              Finalizar votación
            </button>
          </>
        )}
        {mensajeEstado && <p className="text-sm text-slate-600">{mensajeEstado.mensaje}</p>}
      </div>

      <form action={accionHorario} className="mt-6 space-y-3 border-t border-slate-100 pt-5">
        <p className="text-sm font-medium text-slate-700">Horario (hora de Lima)</p>
        <label className="block text-xs text-slate-500">
          Inicio
          <input
            type="datetime-local"
            name="inicio"
            required
            defaultValue={aInputLocal(datos.proceso.fechaInicio)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-marca-500 focus:ring-4 focus:ring-marca-100"
          />
        </label>
        <label className="block text-xs text-slate-500">
          Cierre
          <input
            type="datetime-local"
            name="cierre"
            required
            defaultValue={aInputLocal(datos.proceso.fechaCierre)}
            className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 outline-none focus:border-marca-500 focus:ring-4 focus:ring-marca-100"
          />
        </label>
        <p className="text-xs text-slate-500">
          Vigente: {formatearFecha(datos.proceso.fechaInicio)} – {formatearFecha(datos.proceso.fechaCierre)}
        </p>
        {horario && (
          <p className={`text-sm ${horario.ok ? "text-emerald-700" : "text-red-700"}`} role="status">
            {horario.mensaje}
          </p>
        )}
        <button disabled={guardando} className={`${boton} bg-marca-700 text-white hover:bg-marca-800`}>
          {guardando ? "Guardando…" : "Guardar horario"}
        </button>
      </form>
    </div>
  );
}
