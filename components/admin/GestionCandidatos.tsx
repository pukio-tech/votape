"use client";

import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import type { Respuesta } from "@/app/admin/acciones";
import { eliminarCandidato, eliminarCargo, guardarCandidato, guardarCargo, moverCargo } from "@/app/admin/acciones-eleccion";
import { SubirFoto } from "@/components/admin/SubirFoto";
import { PanelLateral, piePanel } from "@/components/PanelLateral";
import { Alerta, boton, campo, tarjeta } from "@/components/ui";

type Candidato = { id: string; nombreCompleto: string; fotoUrl: string | null; propuestaResumen: string | null };
type Cargo = { id: string; nombre: string; candidatos: Candidato[] };

type Dialogo =
  | { tipo: "cargo"; cargo?: Cargo }
  | { tipo: "candidato"; cargoId: string; candidato?: Candidato }
  | { tipo: "eliminar-cargo"; cargo: Cargo }
  | { tipo: "eliminar-candidato"; candidato: Candidato }
  | null;

const botonIcono =
  "grid size-10 place-items-center rounded-lg text-slate-500 sm:size-9 ring-1 ring-inset ring-slate-200 transition hover:bg-slate-50 hover:text-marca-700 disabled:opacity-40";

export function GestionCandidatos({ cargos, hayVotos }: { cargos: Cargo[]; hayVotos: boolean }) {
  const router = useRouter();
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [aviso, setAviso] = useState<Respuesta>(null);
  const [pendiente, startTransition] = useTransition();
  const total = cargos.reduce((s, c) => s + c.candidatos.length, 0);

  function ejecutar(accion: () => Promise<Respuesta>) {
    startTransition(async () => {
      const r = await accion();
      if (r) setAviso(r);
      setDialogo(null);
      router.refresh();
    });
  }

  const terminar = (r: Respuesta) => {
    setAviso(r);
    setDialogo(null);
    router.refresh();
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-marca-950">Candidatos</h2>
          <p className="mt-1 text-sm text-slate-500">
            {cargos.length} {cargos.length === 1 ? "cargo" : "cargos"} · {total} {total === 1 ? "candidato" : "candidatos"}
          </p>
        </div>
        {!hayVotos && (
          <button onClick={() => setDialogo({ tipo: "cargo" })} className={boton.primario}>
            <Plus className="size-4" aria-hidden /> Nuevo cargo
          </button>
        )}
      </div>

      <div className="mt-5 space-y-3">
        {hayVotos && (
          <Alerta tipo="aviso" titulo="La votación ya tiene votos">
            No se pueden agregar ni eliminar cargos o candidatos. Puedes corregir nombres, fotos y propuestas.
          </Alerta>
        )}
        {aviso && <Alerta tipo={aviso.ok ? "exito" : "error"}>{aviso.mensaje}</Alerta>}
      </div>

      {cargos.length === 0 && (
        <div className={`${tarjeta} mt-6 p-10 text-center`}>
          <p className="font-semibold text-marca-950">Registra el primer cargo</p>
          <p className="mt-1 text-sm text-slate-500">Por ejemplo: Presidencia, Secretaría o Vocalía.</p>
          <button onClick={() => setDialogo({ tipo: "cargo" })} className={`${boton.primario} mt-5`}>
            <Plus className="size-4" aria-hidden /> Nuevo cargo
          </button>
        </div>
      )}

      <div className="mt-6 space-y-6">
        {cargos.map((cargo, i) => (
          <section key={cargo.id} className={`${tarjeta} overflow-hidden`} aria-labelledby={`cargo-${cargo.id}`}>
            <header className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-marca-50/60 px-5 py-3.5">
              <span className="grid size-8 place-items-center rounded-lg bg-marca-600 text-sm font-bold text-white">{i + 1}</span>
              <h3 id={`cargo-${cargo.id}`} className="min-w-0 flex-1 font-bold text-marca-950">
                {cargo.nombre}
                <span className="ml-2 text-sm font-normal text-slate-500">
                  {cargo.candidatos.length} {cargo.candidatos.length === 1 ? "candidato" : "candidatos"}
                </span>
              </h3>
              <div className="flex gap-1.5">
                <button className={botonIcono} disabled={i === 0 || pendiente} onClick={() => ejecutar(() => moverCargo(cargo.id, -1))} aria-label="Subir cargo" title="Subir">
                  <ArrowUp className="size-4" />
                </button>
                <button
                  className={botonIcono}
                  disabled={i === cargos.length - 1 || pendiente}
                  onClick={() => ejecutar(() => moverCargo(cargo.id, 1))}
                  aria-label="Bajar cargo"
                  title="Bajar"
                >
                  <ArrowDown className="size-4" />
                </button>
                <button className={botonIcono} onClick={() => setDialogo({ tipo: "cargo", cargo })} aria-label="Editar cargo" title="Editar">
                  <Pencil className="size-4" />
                </button>
                {!hayVotos && (
                  <button
                    className={`${botonIcono} hover:text-red-600`}
                    onClick={() => setDialogo({ tipo: "eliminar-cargo", cargo })}
                    aria-label="Eliminar cargo"
                    title="Eliminar"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </header>

            <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3">
              {cargo.candidatos.map((c) => (
                <article key={c.id} className="flex gap-4 rounded-lg p-3 ring-1 ring-slate-200">
                  <Foto url={c.fotoUrl} nombre={c.nombreCompleto} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug text-marca-950">{c.nombreCompleto}</p>
                    {c.propuestaResumen ? (
                      <p className="mt-1 line-clamp-2 text-sm text-slate-600">{c.propuestaResumen}</p>
                    ) : (
                      <p className="mt-1 text-sm italic text-slate-400">Sin propuesta</p>
                    )}
                    <div className="mt-1 flex gap-1 text-sm font-semibold [&>button]:-mx-2 [&>button]:rounded-md [&>button]:px-2 [&>button]:py-2 [&>button:hover]:bg-slate-50">
                      <button onClick={() => setDialogo({ tipo: "candidato", cargoId: cargo.id, candidato: c })} className="text-marca-600 hover:text-marca-800">
                        Editar
                      </button>
                      {!hayVotos && (
                        <button onClick={() => setDialogo({ tipo: "eliminar-candidato", candidato: c })} className="text-red-600 hover:text-red-700">
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
              {!hayVotos && (
                <button
                  onClick={() => setDialogo({ tipo: "candidato", cargoId: cargo.id })}
                  className="flex min-h-28 items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 text-sm font-semibold text-marca-600 transition hover:border-marca-400 hover:bg-marca-50/50"
                >
                  <Plus className="size-4" aria-hidden /> Agregar candidato
                </button>
              )}
            </div>
          </section>
        ))}
      </div>

      {dialogo?.tipo === "cargo" && <FormCargo cargo={dialogo.cargo} onCerrar={() => setDialogo(null)} onListo={terminar} />}
      {dialogo?.tipo === "candidato" && (
        <FormCandidato
          cargos={cargos}
          cargoId={dialogo.cargoId}
          candidato={dialogo.candidato}
          bloquearCargo={hayVotos}
          onCerrar={() => setDialogo(null)}
          onListo={terminar}
        />
      )}
      {(dialogo?.tipo === "eliminar-cargo" || dialogo?.tipo === "eliminar-candidato") && (
        <PanelLateral
          titulo={dialogo.tipo === "eliminar-cargo" ? `¿Eliminar el cargo "${dialogo.cargo.nombre}"?` : `¿Eliminar a ${dialogo.candidato.nombreCompleto}?`}
          descripcion={
            dialogo.tipo === "eliminar-cargo" ? "También se eliminarán todos sus candidatos y sus fotos." : "Se eliminará también su foto."
          }
          onCerrar={() => !pendiente && setDialogo(null)}
          pie={
            <>
              <button onClick={() => setDialogo(null)} disabled={pendiente} className={boton.secundario}>
                Cancelar
              </button>
              <button
                disabled={pendiente}
                className={boton.peligro}
                onClick={() =>
                  ejecutar(() => (dialogo.tipo === "eliminar-cargo" ? eliminarCargo(dialogo.cargo.id) : eliminarCandidato(dialogo.candidato.id)))
                }
              >
                {pendiente && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Eliminar
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-600">Esta acción no se puede deshacer.</p>
        </PanelLateral>
      )}
    </main>
  );
}

function Foto({ url, nombre }: { url: string | null; nombre: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={`Foto de ${nombre}`} className="size-20 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />;
  }
  return (
    <span className="grid size-20 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400 ring-1 ring-slate-200">
      <UserRound className="size-8" aria-hidden />
    </span>
  );
}

function FormCargo({ cargo, onCerrar, onListo }: { cargo?: Cargo; onCerrar: () => void; onListo: (r: Respuesta) => void }) {
  const [estado, accion, pendiente] = useActionState<Respuesta, FormData>(async (prev, fd) => {
    const r = await guardarCargo(prev, fd);
    if (r?.ok) onListo(r);
    return r;
  }, null);

  return (
    <PanelLateral titulo={cargo ? "Editar cargo" : "Nuevo cargo"} onCerrar={onCerrar}>
      <form action={accion} className="space-y-4">
        {cargo && <input type="hidden" name="id" value={cargo.id} />}
        <label className="block text-sm font-semibold text-marca-900">
          Nombre del cargo
          <input name="nombre" required autoFocus defaultValue={cargo?.nombre} placeholder="Presidencia" className={`${campo} mt-1.5`} />
        </label>
        {estado && !estado.ok && <Alerta tipo="error">{estado.mensaje}</Alerta>}
        <div className={piePanel}>
          <button type="button" onClick={onCerrar} className={boton.secundario}>
            Cancelar
          </button>
          <button disabled={pendiente} className={boton.primario}>
            {pendiente && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Guardar
          </button>
        </div>
      </form>
    </PanelLateral>
  );
}

function FormCandidato({
  cargos,
  cargoId,
  candidato,
  bloquearCargo,
  onCerrar,
  onListo,
}: {
  cargos: Cargo[];
  cargoId: string;
  candidato?: Candidato;
  bloquearCargo: boolean;
  onCerrar: () => void;
  onListo: (r: Respuesta) => void;
}) {
  const [propuesta, setPropuesta] = useState(candidato?.propuestaResumen ?? "");
  const [estado, accion, pendiente] = useActionState<Respuesta, FormData>(async (prev, fd) => {
    const r = await guardarCandidato(prev, fd);
    if (r?.ok) onListo(r);
    return r;
  }, null);

  return (
    <PanelLateral titulo={candidato ? "Editar candidato" : "Nuevo candidato"} onCerrar={onCerrar}>
      <form action={accion} className="space-y-4">
        {candidato && <input type="hidden" name="id" value={candidato.id} />}
        <div>
          <p className="mb-1.5 text-sm font-semibold text-marca-900">Foto</p>
          <SubirFoto name="fotoUrl" inicial={candidato?.fotoUrl} />
        </div>
        <label className="block text-sm font-semibold text-marca-900">
          Nombre completo
          <input
            name="nombreCompleto"
            required
            defaultValue={candidato?.nombreCompleto}
            placeholder="María Fernanda Ríos Paredes"
            className={`${campo} mt-1.5`}
          />
        </label>
        <label className="block text-sm font-semibold text-marca-900">
          Cargo
          {bloquearCargo && <input type="hidden" name="cargoId" value={cargoId} />}
          <select name="cargoId" defaultValue={cargoId} disabled={bloquearCargo} className={`${campo} mt-1.5`}>
            {cargos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-semibold text-marca-900">
          Propuesta o lista
          <textarea
            name="propuestaResumen"
            rows={3}
            maxLength={400}
            value={propuesta}
            onChange={(e) => setPropuesta(e.target.value)}
            placeholder="Lista Unidad Estudiantil. Comedor con horario extendido y becas de transporte."
            className={`${campo} mt-1.5 resize-none`}
          />
          <span className="mt-1 block text-right text-xs font-normal text-slate-400">{propuesta.length}/400</span>
        </label>
        {estado && !estado.ok && <Alerta tipo="error">{estado.mensaje}</Alerta>}
        <div className={piePanel}>
          <button type="button" onClick={onCerrar} className={boton.secundario}>
            Cancelar
          </button>
          <button disabled={pendiente} className={boton.primario}>
            {pendiente && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Guardar candidato
          </button>
        </div>
      </form>
    </PanelLateral>
  );
}
