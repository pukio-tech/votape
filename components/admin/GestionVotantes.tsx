"use client";

import {
  Ban,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileUp,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import {
  anularToken,
  eliminarVotante,
  exportarTokens,
  guardarVotante,
  importarVotantes,
  regenerarToken,
  verToken,
  type RespuestaVotante,
} from "@/app/admin/acciones-votantes";
import { Modal } from "@/components/Modal";
import { Alerta, Insignia, boton, campo, tarjeta } from "@/components/ui";
import { formatearFecha } from "@/lib/fechas";

type Votante = {
  id: string;
  codigoEstudiante: string;
  dni: string | null;
  nombres: string;
  apellidos: string;
  correo: string | null;
  estado: "PENDIENTE" | "USADO" | "ANULADO" | null;
  tieneCopia: boolean;
  fechaUso: string | null;
};

type Dialogo =
  | { tipo: "form"; votante?: Votante }
  | { tipo: "importar" }
  | { tipo: "eliminar"; votante: Votante }
  | { tipo: "token"; token: NonNullable<NonNullable<RespuestaVotante>["token"]> }
  | null;

const ESTADOS: { valor: string; texto: string }[] = [
  { valor: "", texto: "Todos" },
  { valor: "PENDIENTE", texto: "Pendientes" },
  { valor: "USADO", texto: "Ya votaron" },
  { valor: "ANULADO", texto: "Anulados" },
  { valor: "SIN_TOKEN", texto: "Sin token" },
];

function InsigniaEstado({ estado }: { estado: Votante["estado"] }) {
  if (estado === "USADO") return <Insignia color="verde" punto>Votó</Insignia>;
  if (estado === "PENDIENTE") return <Insignia color="marca" punto>Pendiente</Insignia>;
  if (estado === "ANULADO") return <Insignia color="rojo" punto>Anulado</Insignia>;
  return <Insignia color="gris">Sin token</Insignia>;
}

const botonIcono =
  "grid size-8 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-marca-700 disabled:pointer-events-none disabled:opacity-30";

export function GestionVotantes({
  votantes,
  filtros,
  total,
  paginas,
  resumen,
}: {
  votantes: Votante[];
  filtros: { q: string; estado: string; pagina: number };
  total: number;
  paginas: number;
  resumen: { padron: number; pendientes: number; votaron: number; anulados: number };
}) {
  const router = useRouter();
  const [dialogo, setDialogo] = useState<Dialogo>(null);
  const [aviso, setAviso] = useState<RespuestaVotante>(null);
  const [pendiente, startTransition] = useTransition();
  const [visibles, setVisibles] = useState<Record<string, string>>({});
  const [copiado, setCopiado] = useState("");

  function alternarToken(v: Votante) {
    if (visibles[v.id]) {
      setVisibles((s) => Object.fromEntries(Object.entries(s).filter(([id]) => id !== v.id)));
      return;
    }
    startTransition(async () => {
      const r = await verToken(v.id);
      if (r?.token) setVisibles((s) => ({ ...s, [v.id]: r.token!.valor }));
      else setAviso(r);
    });
  }

  async function copiar(id: string, valor: string) {
    await navigator.clipboard.writeText(valor).catch(() => null);
    setCopiado(id);
    setTimeout(() => setCopiado((c) => (c === id ? "" : c)), 1500);
  }

  function descargarTodos() {
    startTransition(async () => {
      const r = await exportarTokens();
      if (r?.tokens) descargarCsv(r.tokens);
      setAviso(r);
    });
  }

  const url = (cambios: Partial<typeof filtros>) => {
    const f = { ...filtros, ...cambios };
    const p = new URLSearchParams();
    if (f.q) p.set("q", f.q);
    if (f.estado) p.set("estado", f.estado);
    if (f.pagina > 1) p.set("pagina", String(f.pagina));
    const s = p.toString();
    return `/admin/votantes${s ? `?${s}` : ""}`;
  };

  function ejecutar(accion: () => Promise<RespuestaVotante>) {
    startTransition(async () => {
      const r = await accion();
      if (r?.token) setDialogo({ tipo: "token", token: r.token });
      else setDialogo(null);
      setAviso(r);
      router.refresh();
    });
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-marca-950">Padrón de votantes</h2>
          <p className="mt-1 text-sm text-slate-500">
            {resumen.padron.toLocaleString("es-PE")} electores · {resumen.votaron} votaron · {resumen.pendientes} pendientes
            {resumen.anulados ? ` · ${resumen.anulados} anulados` : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={descargarTodos} disabled={pendiente} className={boton.secundario}>
            <Download className="size-4" aria-hidden /> Descargar tokens
          </button>
          <button onClick={() => setDialogo({ tipo: "importar" })} className={boton.secundario}>
            <FileUp className="size-4" aria-hidden /> Importar CSV
          </button>
          <button onClick={() => setDialogo({ tipo: "form" })} className={boton.primario}>
            <Plus className="size-4" aria-hidden /> Nuevo votante
          </button>
        </div>
      </div>

      {/* Filtros: formulario GET, funciona también sin JavaScript */}
      <form action="/admin/votantes" className="mt-6 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Buscar</span>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-[18px] -translate-y-1/2 text-slate-400" aria-hidden />
          <input name="q" defaultValue={filtros.q} placeholder="Buscar por código, DNI, nombre o correo" className={`${campo} pl-11`} />
        </label>
        <select name="estado" defaultValue={filtros.estado} className={`${campo} sm:w-48`} aria-label="Estado del token">
          {ESTADOS.map((e) => (
            <option key={e.valor} value={e.valor}>
              {e.texto}
            </option>
          ))}
        </select>
        <button className={boton.primario}>Buscar</button>
      </form>

      {aviso && !aviso.token && (
        <div className="mt-4">
          <Alerta tipo={aviso.ok ? "exito" : "error"}>{aviso.mensaje}</Alerta>
        </div>
      )}

      <div className={`${tarjeta} mt-4 overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-marca-800 text-left text-xs uppercase tracking-wide text-white">
              <tr>
                <th className="px-4 py-3 font-semibold">Código</th>
                <th className="px-4 py-3 font-semibold">DNI</th>
                <th className="px-4 py-3 font-semibold">Apellidos y nombres</th>
                <th className="px-4 py-3 font-semibold">Correo</th>
                <th className="px-4 py-3 font-semibold">Estado</th>
                <th className="px-4 py-3 font-semibold">Token</th>
                <th className="px-4 py-3 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {votantes.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    {filtros.q || filtros.estado ? "No hay votantes que coincidan con la búsqueda." : "Aún no hay votantes. Regístralos o importa un CSV."}
                  </td>
                </tr>
              )}
              {votantes.map((v) => (
                <tr key={v.id} className="hover:bg-marca-50/40">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-marca-900">{v.codigoEstudiante}</td>
                  <td className="whitespace-nowrap px-4 py-3 tabular-nums text-slate-600">{v.dni ?? "—"}</td>
                  <td className="px-4 py-3 font-medium text-marca-950">
                    {v.apellidos}, {v.nombres}
                  </td>
                  <td className="max-w-48 truncate px-4 py-3 text-slate-600">{v.correo ?? "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3" title={v.fechaUso ? `Votó el ${formatearFecha(v.fechaUso)}` : undefined}>
                    <InsigniaEstado estado={v.estado} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-2">
                    {v.estado === "USADO" ? (
                      <span className="text-xs text-slate-400">Ya usado</span>
                    ) : v.estado && v.tieneCopia ? (
                      <div className="flex items-center gap-1">
                        <span className={`font-mono text-sm tracking-wider ${visibles[v.id] ? "font-semibold text-marca-950" : "text-slate-400"}`}>
                          {visibles[v.id] ?? "•••••-•••••"}
                        </span>
                        <button
                          className={botonIcono}
                          disabled={pendiente}
                          onClick={() => alternarToken(v)}
                          title={visibles[v.id] ? "Ocultar token" : "Ver token"}
                          aria-label={`${visibles[v.id] ? "Ocultar" : "Ver"} token de ${v.codigoEstudiante}`}
                        >
                          {visibles[v.id] ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                        {visibles[v.id] && (
                          <button
                            className={botonIcono}
                            onClick={() => copiar(v.id, visibles[v.id])}
                            title="Copiar token"
                            aria-label={`Copiar token de ${v.codigoEstudiante}`}
                          >
                            {copiado === v.id ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
                          </button>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">{v.estado ? "Genera uno nuevo para verlo" : "—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end gap-0.5">
                      <button className={botonIcono} onClick={() => setDialogo({ tipo: "form", votante: v })} title="Editar" aria-label={`Editar a ${v.codigoEstudiante}`}>
                        <Pencil className="size-4" />
                      </button>
                      <button
                        className={botonIcono}
                        disabled={v.estado === "USADO" || pendiente}
                        onClick={() => ejecutar(() => regenerarToken(v.id))}
                        title={v.estado ? "Generar token nuevo" : "Generar token"}
                        aria-label={`Generar token para ${v.codigoEstudiante}`}
                      >
                        <KeyRound className="size-4" />
                      </button>
                      <button
                        className={`${botonIcono} hover:text-red-600`}
                        disabled={v.estado !== "PENDIENTE" || pendiente}
                        onClick={() => ejecutar(() => anularToken(v.id))}
                        title="Anular token"
                        aria-label={`Anular token de ${v.codigoEstudiante}`}
                      >
                        <Ban className="size-4" />
                      </button>
                      <button
                        className={`${botonIcono} hover:text-red-600`}
                        disabled={v.estado === "USADO"}
                        onClick={() => setDialogo({ tipo: "eliminar", votante: v })}
                        title="Eliminar"
                        aria-label={`Eliminar a ${v.codigoEstudiante}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
          <span>
            {total.toLocaleString("es-PE")} {total === 1 ? "resultado" : "resultados"} · página {filtros.pagina} de {paginas}
          </span>
          <div className="flex gap-2">
            <Link
              href={url({ pagina: filtros.pagina - 1 })}
              aria-disabled={filtros.pagina <= 1}
              className={`${boton.secundario} px-3 py-1.5 ${filtros.pagina <= 1 ? "pointer-events-none opacity-40" : ""}`}
            >
              <ChevronLeft className="size-4" aria-hidden /> Anterior
            </Link>
            <Link
              href={url({ pagina: filtros.pagina + 1 })}
              aria-disabled={filtros.pagina >= paginas}
              className={`${boton.secundario} px-3 py-1.5 ${filtros.pagina >= paginas ? "pointer-events-none opacity-40" : ""}`}
            >
              Siguiente <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      </div>

      {dialogo?.tipo === "form" && (
        <FormVotante
          votante={dialogo.votante}
          onCerrar={() => setDialogo(null)}
          onListo={(r) => {
            setAviso(r);
            setDialogo(r?.token ? { tipo: "token", token: r.token } : null);
            router.refresh();
          }}
        />
      )}
      {dialogo?.tipo === "importar" && <FormImportar onCerrar={() => setDialogo(null)} onListo={() => router.refresh()} />}
      {dialogo?.tipo === "token" && <TokenGenerado token={dialogo.token} onCerrar={() => setDialogo(null)} />}
      {dialogo?.tipo === "eliminar" && (
        <Modal
          titulo={`¿Eliminar a ${dialogo.votante.nombres} ${dialogo.votante.apellidos}?`}
          descripcion={`Código ${dialogo.votante.codigoEstudiante}. Su token dejará de funcionar.`}
          onCerrar={() => !pendiente && setDialogo(null)}
          pie={
            <>
              <button onClick={() => setDialogo(null)} disabled={pendiente} className={boton.secundario}>
                Cancelar
              </button>
              <button onClick={() => ejecutar(() => eliminarVotante(dialogo.votante.id))} disabled={pendiente} className={boton.peligro}>
                {pendiente && <Loader2 className="size-4 animate-spin" aria-hidden />}
                Eliminar
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-600">Esta acción no se puede deshacer.</p>
        </Modal>
      )}
    </main>
  );
}

function FormVotante({
  votante,
  onCerrar,
  onListo,
}: {
  votante?: Votante;
  onCerrar: () => void;
  onListo: (r: RespuestaVotante) => void;
}) {
  const [estado, accion, pendiente] = useActionState<RespuestaVotante, FormData>(async (prev, fd) => {
    const r = await guardarVotante(prev, fd);
    if (r?.ok) onListo(r);
    return r;
  }, null);

  return (
    <Modal
      titulo={votante ? "Editar votante" : "Nuevo votante"}
      descripcion={votante ? undefined : "Al guardar se genera su token de acceso personal."}
      onCerrar={onCerrar}
    >
      <form action={accion} className="space-y-4">
        {votante && <input type="hidden" name="id" value={votante.id} />}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-semibold text-marca-900">
            Código de estudiante
            <input name="codigoEstudiante" required defaultValue={votante?.codigoEstudiante} placeholder="2026100001" className={`${campo} mt-1.5`} />
          </label>
          <label className="block text-sm font-semibold text-marca-900">
            DNI <span className="font-normal text-slate-400">(opcional)</span>
            <input name="dni" inputMode="numeric" defaultValue={votante?.dni ?? ""} placeholder="71234567" className={`${campo} mt-1.5`} />
          </label>
          <label className="block text-sm font-semibold text-marca-900">
            Nombres
            <input name="nombres" required defaultValue={votante?.nombres} placeholder="Rosa Elena" className={`${campo} mt-1.5`} />
          </label>
          <label className="block text-sm font-semibold text-marca-900">
            Apellidos
            <input name="apellidos" required defaultValue={votante?.apellidos} placeholder="Huamán Pérez" className={`${campo} mt-1.5`} />
          </label>
        </div>
        <label className="block text-sm font-semibold text-marca-900">
          Correo <span className="font-normal text-slate-400">(opcional)</span>
          <input name="correo" type="email" defaultValue={votante?.correo ?? ""} placeholder="rosa.huaman@unsm.edu.pe" className={`${campo} mt-1.5`} />
        </label>
        {estado && !estado.ok && <Alerta tipo="error">{estado.mensaje}</Alerta>}
        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCerrar} className={boton.secundario}>
            Cancelar
          </button>
          <button disabled={pendiente} className={boton.primario}>
            {pendiente && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {votante ? "Guardar cambios" : "Registrar votante"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function TokenGenerado({ token, onCerrar }: { token: NonNullable<NonNullable<RespuestaVotante>["token"]>; onCerrar: () => void }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <Modal
      titulo="Token de acceso"
      descripcion="Entrégalo al votante. También puedes consultarlo después en la tabla."
      onCerrar={onCerrar}
      pie={
        <button onClick={onCerrar} className={boton.primario}>
          Listo
        </button>
      }
    >
      <div className="rounded-lg bg-marca-50 p-5 text-center ring-1 ring-inset ring-marca-100">
        <p className="text-sm text-marca-800">
          {token.nombre} · <span className="font-mono">{token.codigo}</span>
        </p>
        <p className="mt-2 font-mono text-3xl font-bold tracking-[0.15em] text-marca-950">{token.valor}</p>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(token.valor).catch(() => null);
            setCopiado(true);
          }}
          className={`${boton.secundario} mt-4 px-3.5 py-2`}
        >
          {copiado ? <Check className="size-4 text-emerald-600" aria-hidden /> : <Copy className="size-4" aria-hidden />}
          {copiado ? "Copiado" : "Copiar token"}
        </button>
      </div>
    </Modal>
  );
}

function descargarCsv(filas: Record<string, string>[]) {
  const columnas = Object.keys(filas[0] ?? {});
  const esc = (v: string) => (/[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const texto = "﻿" + [columnas.join(","), ...filas.map((f) => columnas.map((c) => esc(f[c] ?? "")).join(","))].join("\n");
  const enlace = document.createElement("a");
  enlace.href = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
  enlace.download = `tokens-${new Date().toISOString().slice(0, 10)}.csv`;
  enlace.click();
  URL.revokeObjectURL(enlace.href);
}

function FormImportar({ onCerrar, onListo }: { onCerrar: () => void; onListo: () => void }) {
  const [estado, accion, pendiente] = useActionState<RespuestaVotante, FormData>(async (prev, fd) => {
    const r = await importarVotantes(prev, fd);
    if (r?.ok) onListo();
    return r;
  }, null);

  return (
    <Modal titulo="Importar padrón" descripcion="Exporta tu Excel como «CSV UTF-8» con estas columnas:" onCerrar={pendiente ? undefined : onCerrar}>
      {estado?.ok ? (
        <div className="space-y-4">
          <Alerta tipo="exito">{estado.mensaje}</Alerta>
          {estado.tokens && estado.tokens.length > 0 ? (
            <>
              <p className="text-sm text-slate-600">
                Descarga el archivo con los tokens nuevos. También puedes verlos luego en la tabla.
              </p>
              <button onClick={() => descargarCsv(estado.tokens!)} className={`${boton.primario} w-full`}>
                <Download className="size-4" aria-hidden /> Descargar tokens (CSV)
              </button>
            </>
          ) : (
            <p className="text-sm text-slate-600">Todos los votantes del archivo ya tenían token; solo se actualizaron sus datos.</p>
          )}
          <button onClick={onCerrar} className={`${boton.secundario} w-full`}>
            Cerrar
          </button>
        </div>
      ) : (
        <form action={accion} className="space-y-4">
          <code className="block rounded-lg bg-slate-100 px-3 py-2 font-mono text-xs text-marca-900">codigo;dni;nombres;apellidos;correo</code>
          <p className="text-xs text-slate-500">
            Si un código ya existe, se actualizan sus datos y conserva su token. Solo se generan tokens para los votantes nuevos.
          </p>
          <input
            name="archivo"
            type="file"
            accept=".csv,text/csv"
            required
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-marca-50 file:px-4 file:py-2.5 file:font-semibold file:text-marca-700 hover:file:bg-marca-100"
          />
          {estado && !estado.ok && (
            <Alerta tipo="error" titulo={estado.mensaje}>
              {estado.errores && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4">
                  {estado.errores.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
            </Alerta>
          )}
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCerrar} disabled={pendiente} className={boton.secundario}>
              Cancelar
            </button>
            <button disabled={pendiente} className={boton.primario}>
              {pendiente ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <FileUp className="size-4" aria-hidden />}
              Importar
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
