"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { formatearFecha } from "@/lib/fechas";

type Candidato = { id: string; nombreCompleto: string; fotoUrl: string | null; propuestaResumen: string | null };
type Cargo = { id: string; nombre: string; candidatos: Candidato[] };

type Fase =
  | { tipo: "eligiendo" }
  | { tipo: "confirmando" }
  | { tipo: "enviando" }
  | { tipo: "error"; mensaje: string; fatal: boolean }
  | { tipo: "listo"; constancia: string; fecha: string };

export function Cedula({ votante, codigo, cargos }: { votante: string; codigo: string; cargos: Cargo[] }) {
  const [selecciones, setSelecciones] = useState<Record<string, string>>({});
  const [fase, setFase] = useState<Fase>({ tipo: "eligiendo" });

  const completos = cargos.filter((c) => selecciones[c.id]).length;
  const todoListo = completos === cargos.length;

  // Evita cerrar la pestaña por accidente con la cédula a medio llenar.
  useEffect(() => {
    if (fase.tipo === "listo" || completos === 0) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [completos, fase.tipo]);

  async function emitir() {
    setFase({ tipo: "enviando" });
    try {
      const res = await fetch("/api/votar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selecciones }),
      });
      const datos = await res.json();
      if (!res.ok) {
        setFase({ tipo: "error", mensaje: datos.error ?? "No se pudo registrar el voto.", fatal: res.status !== 400 });
        return;
      }
      setFase({ tipo: "listo", constancia: datos.constancia, fecha: datos.fecha });
      window.scrollTo({ top: 0 });
    } catch {
      setFase({ tipo: "error", mensaje: "Sin conexión. Revisa tu internet e inténtalo de nuevo.", fatal: false });
    }
  }

  if (fase.tipo === "listo") return <Constancia constancia={fase.constancia} fecha={fase.fecha} />;

  return (
    <main className="flex-1 pb-28">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:p-5">
          <p className="text-sm text-slate-500">Votante</p>
          <p className="font-semibold text-slate-900">
            {votante} <span className="font-normal text-slate-500">· {codigo}</span>
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Elige <strong>un candidato por cada cargo</strong>. Antes de registrar tu voto podrás revisar tu selección.
          </p>
        </div>

        {cargos.map((cargo, i) => (
          <section key={cargo.id} className="mt-8" aria-labelledby={`cargo-${cargo.id}`}>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id={`cargo-${cargo.id}`} className="text-lg font-semibold text-slate-900">
                <span className="mr-2 text-marca-500">{i + 1}.</span>
                {cargo.nombre}
              </h2>
              {selecciones[cargo.id] ? (
                <span className="text-xs font-medium text-emerald-700">✓ Seleccionado</span>
              ) : (
                <span className="text-xs text-slate-400">Pendiente</span>
              )}
            </div>
            <div role="radiogroup" aria-labelledby={`cargo-${cargo.id}`} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cargo.candidatos.map((c) => (
                <TarjetaCandidato
                  key={c.id}
                  candidato={c}
                  nombreGrupo={cargo.id}
                  seleccionado={selecciones[cargo.id] === c.id}
                  onSeleccionar={() => setSelecciones((s) => ({ ...s, [cargo.id]: c.id }))}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Barra inferior fija con el progreso */}
      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-slate-800">
              {completos} de {cargos.length} cargos
            </p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-marca-500 transition-all" style={{ width: `${(completos / cargos.length) * 100}%` }} />
            </div>
          </div>
          <button
            type="button"
            disabled={!todoListo}
            onClick={() => setFase({ tipo: "confirmando" })}
            className="shrink-0 rounded-lg bg-marca-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-marca-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Revisar voto
          </button>
        </div>
      </div>

      {fase.tipo !== "eligiendo" && (
        <Confirmacion
          cargos={cargos}
          selecciones={selecciones}
          fase={fase}
          onCancelar={() => setFase({ tipo: "eligiendo" })}
          onConfirmar={emitir}
        />
      )}
    </main>
  );
}

function TarjetaCandidato({
  candidato,
  nombreGrupo,
  seleccionado,
  onSeleccionar,
}: {
  candidato: Candidato;
  nombreGrupo: string;
  seleccionado: boolean;
  onSeleccionar: () => void;
}) {
  const [expandido, setExpandido] = useState(false);
  return (
    <label
      className={`relative flex cursor-pointer gap-4 rounded-xl bg-white p-4 shadow-sm ring-1 transition has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-marca-200 ${
        seleccionado ? "ring-2 ring-marca-500 bg-marca-50/60" : "ring-slate-200 hover:ring-marca-200"
      }`}
    >
      <input
        type="radio"
        name={nombreGrupo}
        value={candidato.id}
        aria-label={candidato.nombreCompleto}
        checked={seleccionado}
        onChange={onSeleccionar}
        className="sr-only"
      />
      <Foto url={candidato.fotoUrl} nombre={candidato.nombreCompleto} className="size-20 sm:size-24" />
      <div className="min-w-0 flex-1">
        <p className="pr-7 font-semibold leading-snug text-slate-900">{candidato.nombreCompleto}</p>
        {candidato.propuestaResumen && (
          <>
            <p className={`mt-1.5 text-sm text-slate-600 ${expandido ? "" : "line-clamp-3"}`}>{candidato.propuestaResumen}</p>
            {candidato.propuestaResumen.length > 110 && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setExpandido((v) => !v);
                }}
                className="mt-1 text-xs font-medium text-marca-600 hover:text-marca-800"
              >
                {expandido ? "Ver menos" : "Ver propuesta completa"}
              </button>
            )}
          </>
        )}
      </div>
      <span
        aria-hidden
        className={`absolute right-3 top-3 grid size-6 place-items-center rounded-full border-2 transition ${
          seleccionado ? "border-marca-600 bg-marca-600 text-white" : "border-slate-300 bg-white"
        }`}
      >
        {seleccionado && (
          <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
            <path fillRule="evenodd" d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.8 3.8 6.8-6.8a1 1 0 0 1 1.4 0Z" clipRule="evenodd" />
          </svg>
        )}
      </span>
    </label>
  );
}

function Foto({ url, nombre, className }: { url: string | null; nombre: string; className?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={`Foto de ${nombre}`} className={`shrink-0 rounded-lg object-cover ring-1 ring-slate-200 ${className}`} />;
  }
  const iniciales = nombre.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("");
  return (
    <div className={`grid shrink-0 place-items-center rounded-lg bg-marca-100 text-xl font-semibold text-marca-700 ${className}`}>
      {iniciales}
    </div>
  );
}

function Confirmacion({
  cargos,
  selecciones,
  fase,
  onCancelar,
  onConfirmar,
}: {
  cargos: Cargo[];
  selecciones: Record<string, string>;
  fase: Fase;
  onCancelar: () => void;
  onConfirmar: () => void;
}) {
  const enviando = fase.tipo === "enviando";
  const error = fase.tipo === "error" ? fase : null;

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center bg-slate-900/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal aria-labelledby="titulo-confirmacion">
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl">
        <div className="border-b border-slate-100 px-6 py-5">
          <h2 id="titulo-confirmacion" className="text-lg font-semibold text-slate-900">
            Confirma tu voto
          </h2>
          <p className="mt-1 text-sm text-slate-500">Una vez registrado no podrás modificarlo.</p>
        </div>

        <ul className="divide-y divide-slate-100 px-6">
          {cargos.map((cargo) => {
            const c = cargo.candidatos.find((x) => x.id === selecciones[cargo.id]);
            return (
              <li key={cargo.id} className="flex items-center gap-3 py-3">
                {c && <Foto url={c.fotoUrl} nombre={c.nombreCompleto} className="size-12 text-sm" />}
                <div className="min-w-0">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{cargo.nombre}</p>
                  <p className="font-medium text-slate-900">{c?.nombreCompleto}</p>
                </div>
              </li>
            );
          })}
        </ul>

        {error && (
          <p role="alert" className="mx-6 mb-2 rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-red-200">
            {error.mensaje}
          </p>
        )}

        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:justify-end">
          {error?.fatal ? (
            <Link href="/" className="rounded-lg bg-marca-700 px-5 py-3 text-center text-sm font-semibold text-white hover:bg-marca-800">
              Volver al inicio
            </Link>
          ) : (
            <>
              <button
                type="button"
                onClick={onCancelar}
                disabled={enviando}
                className="rounded-lg px-5 py-3 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 disabled:opacity-50"
              >
                Modificar selección
              </button>
              <button
                type="button"
                onClick={onConfirmar}
                disabled={enviando}
                className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
              >
                {enviando ? "Registrando voto…" : "Confirmar y emitir voto"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Constancia({ constancia, fecha }: { constancia: string; fecha: string }) {
  return (
    <main className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <div className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="size-8" aria-hidden>
            <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="mt-5 text-xl font-semibold text-slate-900">¡Tu voto fue registrado!</h2>
        <p className="mt-2 text-sm text-slate-600">Gracias por participar. Tu token ha sido desactivado.</p>
        <div className="mt-6 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Código de constancia</p>
          <p className="mt-1 font-mono text-xl font-semibold tracking-widest text-slate-900">{constancia}</p>
          <p className="mt-1 text-xs text-slate-500">{formatearFecha(fecha)}</p>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Toma una captura de pantalla. La constancia acredita tu participación, no revela por quién votaste.
        </p>
        <Link href="/" className="mt-6 inline-block text-sm font-medium text-marca-600 hover:text-marca-800">
          Finalizar
        </Link>
      </div>
    </main>
  );
}
