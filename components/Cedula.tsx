"use client";

import { ArrowRight, BarChart3, Check, CheckCircle2, Copy, Loader2, Printer, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { formatearFecha } from "@/lib/fechas";
import { PanelLateral } from "./PanelLateral";
import { Alerta, boton, tarjeta } from "./ui";

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
  const secciones = useRef<Record<string, HTMLElement | null>>({});

  const completos = cargos.filter((c) => selecciones[c.id]).length;
  const todoListo = completos === cargos.length;

  // Evita cerrar la pestaña por accidente con la cédula a medio llenar.
  useEffect(() => {
    if (fase.tipo === "listo" || completos === 0) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [completos, fase.tipo]);

  function irA(cargoId: string) {
    secciones.current[cargoId]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function elegir(cargoId: string, candidatoId: string) {
    const primeraVez = !selecciones[cargoId];
    const nuevas = { ...selecciones, [cargoId]: candidatoId };
    setSelecciones(nuevas);
    // Al completar un cargo por primera vez, lleva al siguiente pendiente.
    const siguiente = cargos.find((c) => !nuevas[c.id]);
    if (primeraVez && siguiente) setTimeout(() => irA(siguiente.id), 350);
  }

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
    <main className="flex-1 pb-32">
      {/* Navegación por cargos */}
      <div className="sticky top-16 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 py-3 sm:px-6" aria-label="Cargos">
          {cargos.map((c, i) => {
            const hecho = Boolean(selecciones[c.id]);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => irA(c.id)}
                className={`flex shrink-0 items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-sm font-medium ring-1 ring-inset transition ${
                  hecho ? "bg-marca-800 text-white ring-marca-800" : "bg-white text-slate-600 ring-slate-300 hover:ring-marca-300"
                }`}
              >
                <span
                  className={`grid size-6 place-items-center rounded-full text-xs font-bold ${
                    hecho ? "bg-acento-400 text-marca-950" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {hecho ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : i + 1}
                </span>
                {c.nombre}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mt-6 flex flex-col gap-4 rounded-2xl bg-marca-50/70 p-5 ring-1 ring-inset ring-marca-100 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-marca-700">Hola,</p>
            <p className="text-lg font-bold text-marca-950">
              {votante} <span className="text-sm font-medium text-slate-500">· {codigo}</span>
            </p>
          </div>
          <p className="flex items-start gap-2 text-sm text-marca-800 sm:max-w-sm">
            <ShieldCheck className="mt-0.5 size-[18px] shrink-0 text-marca-500" aria-hidden />
            Elige un candidato por cargo. Podrás revisar tu cédula antes de emitir el voto. Tienes 20 minutos.
          </p>
        </div>

        {cargos.map((cargo, i) => (
          <section
            key={cargo.id}
            ref={(el) => {
              secciones.current[cargo.id] = el;
            }}
            className="scroll-mt-36 pt-10"
            aria-labelledby={`cargo-${cargo.id}`}
          >
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-acento-600">
                  Cargo {i + 1} de {cargos.length}
                </p>
                <h2 id={`cargo-${cargo.id}`} className="mt-1 text-xl font-bold tracking-tight text-marca-950">
                  {cargo.nombre}
                </h2>
              </div>
              {selecciones[cargo.id] ? (
                <span className="flex items-center gap-1 text-sm font-semibold text-emerald-700">
                  <CheckCircle2 className="size-4" aria-hidden /> Elegido
                </span>
              ) : (
                <span className="text-sm text-slate-400">Pendiente</span>
              )}
            </div>
            <div role="radiogroup" aria-labelledby={`cargo-${cargo.id}`} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cargo.candidatos.map((c) => (
                <TarjetaCandidato
                  key={c.id}
                  candidato={c}
                  nombreGrupo={cargo.id}
                  seleccionado={selecciones[cargo.id] === c.id}
                  hayOtroSeleccionado={Boolean(selecciones[cargo.id]) && selecciones[cargo.id] !== c.id}
                  onSeleccionar={() => elegir(cargo.id, c.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Barra inferior con el progreso */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-12px_rgb(19_41_75/0.15)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-marca-950">
              {todoListo ? "Cédula completa" : `${completos} de ${cargos.length} cargos elegidos`}
            </p>
            <div className="mt-2 flex gap-1">
              {cargos.map((c) => (
                <span key={c.id} className={`h-1.5 flex-1 rounded-full transition-colors ${selecciones[c.id] ? "bg-acento-400" : "bg-slate-200"}`} />
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              const pendiente = cargos.find((c) => !selecciones[c.id]);
              if (pendiente) irA(pendiente.id);
              else setFase({ tipo: "confirmando" });
            }}
            className={`${todoListo ? boton.primario : boton.secundario} shrink-0`}
          >
            {todoListo ? "Revisar mi voto" : "Siguiente cargo"}
            <ArrowRight className="size-4" aria-hidden />
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
  hayOtroSeleccionado,
  onSeleccionar,
}: {
  candidato: Candidato;
  nombreGrupo: string;
  seleccionado: boolean;
  hayOtroSeleccionado: boolean;
  onSeleccionar: () => void;
}) {
  const [expandido, setExpandido] = useState(false);
  return (
    <label
      className={`group relative flex cursor-pointer gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 transition duration-200 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-marca-200 sm:flex-col sm:p-5 ${
        seleccionado
          ? "ring-2 ring-marca-700 shadow-md shadow-marca-900/10"
          : `ring-slate-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-marca-200 ${hayOtroSeleccionado ? "opacity-70 hover:opacity-100" : ""}`
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
      <Foto url={candidato.fotoUrl} nombre={candidato.nombreCompleto} className="size-20 sm:aspect-square sm:size-auto sm:w-full" />
      <div className="min-w-0 flex-1">
        <p className="pr-8 font-bold leading-snug text-marca-950 sm:pr-0">{candidato.nombreCompleto}</p>
        {candidato.propuestaResumen && (
          <>
            <p className={`mt-1.5 text-sm leading-relaxed text-slate-600 ${expandido ? "" : "line-clamp-3"}`}>{candidato.propuestaResumen}</p>
            {candidato.propuestaResumen.length > 110 && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setExpandido((v) => !v);
                }}
                className="mt-1 text-xs font-semibold text-marca-600 hover:text-marca-800"
              >
                {expandido ? "Ver menos" : "Leer propuesta completa"}
              </button>
            )}
          </>
        )}
        <span
          className={`mt-4 hidden items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition sm:flex ${
            seleccionado ? "bg-marca-800 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-marca-50 group-hover:text-marca-700"
          }`}
          aria-hidden
        >
          {seleccionado ? (
            <>
              <Check className="size-4" strokeWidth={3} /> Elegido
            </>
          ) : (
            "Elegir"
          )}
        </span>
      </div>
      <span
        aria-hidden
        className={`absolute right-3 top-3 grid size-7 place-items-center rounded-full border-2 transition sm:right-7 sm:top-7 ${
          seleccionado ? "scale-100 border-acento-400 bg-acento-400 text-marca-950" : "border-slate-300 bg-white sm:scale-0"
        }`}
      >
        {seleccionado && <Check className="size-4" strokeWidth={3} />}
      </span>
    </label>
  );
}

function Foto({ url, nombre, className }: { url: string | null; nombre: string; className?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={`Foto de ${nombre}`} className={`shrink-0 rounded-xl bg-slate-100 object-cover ${className}`} />;
  }
  const iniciales = nombre.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("");
  return (
    <div className={`grid shrink-0 place-items-center rounded-xl bg-marca-100 text-2xl font-bold text-marca-700 ${className}`}>{iniciales}</div>
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
    <PanelLateral
      titulo="Revisa tu voto"
      descripcion="Al confirmar, tu voto se registra de forma definitiva y tu token se desactiva."
      onCerrar={enviando || error?.fatal ? undefined : onCancelar}
      pie={
        error?.fatal ? (
          <Link href="/" className={boton.primario}>
            Volver al inicio
          </Link>
        ) : (
          <>
            <button type="button" onClick={onCancelar} disabled={enviando} className={boton.secundario}>
              Cambiar selección
            </button>
            <button type="button" onClick={onConfirmar} disabled={enviando} className={boton.exito}>
              {enviando ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" strokeWidth={3} aria-hidden />}
              {enviando ? "Registrando voto" : "Confirmar y emitir voto"}
            </button>
          </>
        )
      }
    >
      <ul className="space-y-2.5">
        {cargos.map((cargo) => {
          const c = cargo.candidatos.find((x) => x.id === selecciones[cargo.id]);
          return (
            <li key={cargo.id} className="flex items-center gap-3.5 rounded-2xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200/70">
              {c && <Foto url={c.fotoUrl} nombre={c.nombreCompleto} className="size-14 text-base" />}
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-acento-600">{cargo.nombre}</p>
                <p className="font-bold text-marca-950">{c?.nombreCompleto}</p>
              </div>
            </li>
          );
        })}
      </ul>
      {error && (
        <div className="mt-4">
          <Alerta tipo="error">{error.mensaje}</Alerta>
        </div>
      )}
    </PanelLateral>
  );
}

function Constancia({ constancia, fecha }: { constancia: string; fecha: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(constancia);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      /* el portapapeles puede no estar disponible */
    }
  }

  return (
    <main className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center">
      <div className={`${tarjeta} w-full max-w-md animate-aparecer overflow-hidden text-center`}>
        <div className="bg-marca-800 px-8 pb-8 pt-10 text-white">
          <div className="mx-auto grid size-16 place-items-center rounded-full bg-acento-400 text-marca-950 shadow-lg shadow-acento-500/30">
            <Check className="size-8" strokeWidth={3} aria-hidden />
          </div>
          <h2 className="mt-5 text-2xl font-bold tracking-tight">¡Tu voto fue registrado!</h2>
          <p className="mt-2 text-sm text-marca-200">Gracias por participar. Tu token ya fue desactivado.</p>
        </div>
        <div className="p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Código de constancia</p>
          <p className="mt-2 font-mono text-2xl font-bold tracking-[0.15em] text-marca-950">{constancia}</p>
          <p className="mt-1 text-xs text-slate-500">{formatearFecha(fecha)}</p>

          <div className="mt-6 grid grid-cols-2 gap-2 print:hidden">
            <button type="button" onClick={copiar} className={`${boton.secundario} px-3`}>
              {copiado ? <Check className="size-4 text-emerald-600" aria-hidden /> : <Copy className="size-4" aria-hidden />}
              {copiado ? "Copiado" : "Copiar"}
            </button>
            <button type="button" onClick={() => window.print()} className={`${boton.secundario} px-3`}>
              <Printer className="size-4" aria-hidden /> Imprimir
            </button>
          </div>
          <p className="mt-5 text-xs leading-relaxed text-slate-500">
            Guarda este código o toma una captura. Acredita tu participación, pero no revela por quién votaste.
          </p>
          <div className="mt-5 grid gap-2 print:hidden">
            <Link href="/resultados" className={boton.primario}>
              <BarChart3 className="size-4" aria-hidden /> Ver resultados en vivo
            </Link>
            <Link href="/" className={boton.fantasma}>
              Finalizar
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
