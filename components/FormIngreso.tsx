"use client";

import { useActionState } from "react";
import { ingresar, type EstadoIngreso } from "@/app/acciones";
import { formatearFecha } from "@/lib/fechas";

export function FormIngreso() {
  const [estado, accion, pendiente] = useActionState<EstadoIngreso, FormData>(ingresar, { tipo: "inicial" });

  if (estado.tipo === "bloqueado") {
    return (
      <div className="text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-red-50 text-red-600 ring-8 ring-red-50/50">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="size-7" aria-hidden>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-900">
          {estado.motivo === "USADO" ? "Este token ya fue utilizado" : "Este token fue anulado"}
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          {estado.motivo === "USADO"
            ? `Tu voto ya fue registrado${estado.fecha ? ` el ${formatearFecha(estado.fecha)}` : ""}. No es posible votar dos veces.`
            : "Comunícate con el comité electoral para regularizar tu acceso."}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 text-sm font-medium text-marca-600 hover:text-marca-800"
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <form action={accion} className="space-y-4">
      <div>
        <label htmlFor="codigo" className="block text-sm font-medium text-slate-700">
          Código de estudiante
        </label>
        <input
          id="codigo"
          name="codigo"
          required
          defaultValue={estado.tipo === "error" ? estado.codigo : undefined}
          inputMode="numeric"
          autoComplete="off"
          placeholder="Ej. 2026100001"
          className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-marca-500 focus:ring-4 focus:ring-marca-100"
        />
      </div>
      <div>
        <label htmlFor="token" className="block text-sm font-medium text-slate-700">
          Token de acceso
        </label>
        <input
          id="token"
          name="token"
          required
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="XXXXX-XXXXX"
          className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 font-mono uppercase tracking-widest text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 placeholder:tracking-widest focus:border-marca-500 focus:ring-4 focus:ring-marca-100"
        />
      </div>

      {estado.tipo === "error" && (
        <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-red-200">
          {estado.mensaje}
        </p>
      )}

      <button
        type="submit"
        disabled={pendiente}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-marca-700 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-marca-800 focus:outline-none focus:ring-4 focus:ring-marca-200 disabled:opacity-60"
      >
        {pendiente ? "Verificando…" : "Ingresar a votar"}
      </button>
    </form>
  );
}
