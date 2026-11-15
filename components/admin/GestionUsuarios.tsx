"use client";

import { Eye, KeyRound, Loader2, Lock, Mail, Plus, ShieldCheck, ShieldOff, UserCog, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { cambiarAccesoUsuario, cambiarRol, crearUsuario, restablecerPassword, type Respuesta } from "@/app/admin/acciones";
import { CampoPassword } from "@/components/CampoPassword";
import { PanelLateral, piePanel } from "@/components/PanelLateral";
import { Alerta, Campo, Insignia, boton, campo, tarjeta } from "@/components/ui";
import { formatearFecha } from "@/lib/fechas";

type Usuario = {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  activo: boolean;
  ultimoAcceso: string | null;
  createdAt: string;
};

type Rol = "ADMIN" | "OBSERVADOR";

const ROLES: Record<Rol, { nombre: string; descripcion: string; Icono: typeof Eye }> = {
  ADMIN: { nombre: "Administrador", descripcion: "Acceso total: jornada, actividad, usuarios y resultados.", Icono: UserCog },
  OBSERVADOR: { nombre: "Observador", descripcion: "Solo ve el tablero de resultados.", Icono: Eye },
};

const AYUDA_PASSWORD = "Mínimo 8 caracteres, con letras y al menos un número.";

function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function GestionUsuarios({ usuarios, usuarioActualId }: { usuarios: Usuario[]; usuarioActualId: string }) {
  const router = useRouter();
  const [creando, setCreando] = useState(false);
  const [cambiandoClave, setCambiandoClave] = useState<Usuario | null>(null);
  const [aviso, setAviso] = useState<Respuesta>(null);
  const [pendiente, startTransition] = useTransition();
  const activos = usuarios.filter((u) => u.activo).length;

  function asignarRol(u: Usuario, rol: Rol) {
    if (rol === u.rol) return;
    if (!window.confirm(`¿Cambiar a ${u.nombre} al rol ${ROLES[rol].nombre}?`)) return;
    startTransition(async () => {
      setAviso(await cambiarRol(u.id, rol));
      router.refresh();
    });
  }

  function alternarAcceso(u: Usuario) {
    const mensaje = u.activo
      ? `¿Quitar el acceso de ${u.nombre}? Su sesión se cerrará de inmediato.`
      : `¿Devolver el acceso al panel a ${u.nombre}?`;
    if (!window.confirm(mensaje)) return;
    startTransition(async () => {
      setAviso(await cambiarAccesoUsuario(u.id, !u.activo));
      router.refresh();
    });
  }

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-marca-950">Usuarios del comité</h2>
            <p className="mt-1 text-sm text-slate-500">
              {activos} {activos === 1 ? "persona tiene" : "personas tienen"} acceso al panel de administración.
            </p>
          </div>
          <button onClick={() => setCreando(true)} className={boton.primario}>
            <Plus className="size-[18px]" aria-hidden /> Nuevo usuario
          </button>
        </div>

        {aviso && (
          <div className="mt-5 animate-aparecer">
            <Alerta tipo={aviso.ok ? "exito" : "error"}>{aviso.mensaje}</Alerta>
          </div>
        )}

        <ul className={`${tarjeta} mt-6 divide-y divide-slate-100 overflow-hidden`}>
          {usuarios.map((u) => {
            const esYo = u.id === usuarioActualId;
            return (
              <li key={u.id} className={`flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center ${u.activo ? "" : "bg-slate-50/70"}`}>
                <div className="flex min-w-0 flex-1 items-center gap-4">
                  <span
                    className={`grid size-11 shrink-0 place-items-center rounded-full text-sm font-bold ${
                      u.activo ? "bg-marca-800 text-acento-300" : "bg-slate-200 text-slate-500"
                    }`}
                    aria-hidden
                  >
                    {iniciales(u.nombre)}
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`truncate font-semibold ${u.activo ? "text-marca-950" : "text-slate-500"}`}>{u.nombre}</p>
                      {esYo && <Insignia color="marca">Tú</Insignia>}
                      <Insignia color={u.rol === "ADMIN" ? "ambar" : "gris"}>{ROLES[u.rol].nombre}</Insignia>
                      {u.activo ? (
                        <Insignia color="verde" punto>
                          Activo
                        </Insignia>
                      ) : (
                        <Insignia color="gris">Sin acceso</Insignia>
                      )}
                    </div>
                    <p className="truncate text-sm text-slate-500">{u.correo}</p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {u.ultimoAcceso ? `Último ingreso: ${formatearFecha(u.ultimoAcceso)}` : "Aún no ha ingresado"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 pl-15 max-sm:pl-0 lg:shrink-0 lg:flex-nowrap lg:pl-0">
                  {!esYo && (
                    <label className="flex-1 sm:flex-none">
                      <span className="sr-only">Rol de {u.nombre}</span>
                      <select
                        value={u.rol}
                        disabled={pendiente}
                        onChange={(e) => asignarRol(u, e.target.value as Rol)}
                        className="h-full w-full cursor-pointer rounded-xl border-0 bg-white py-2 pl-3 pr-8 text-sm font-semibold text-marca-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:ring-2 focus:ring-marca-600"
                      >
                        <option value="ADMIN">Administrador</option>
                        <option value="OBSERVADOR">Observador</option>
                      </select>
                    </label>
                  )}
                  <button onClick={() => setCambiandoClave(u)} className={`${boton.secundario} flex-1 px-3.5 py-2 sm:flex-none`}>
                    <KeyRound className="size-4" aria-hidden /> {esYo ? "Cambiar contraseña" : "Restablecer clave"}
                  </button>
                  {!esYo && (
                    <button
                      onClick={() => alternarAcceso(u)}
                      disabled={pendiente}
                      className={`${boton.secundario} flex-1 px-3.5 py-2 sm:flex-none ${u.activo ? "text-red-700 hover:bg-red-50" : "text-emerald-700 hover:bg-emerald-50"}`}
                    >
                      {u.activo ? <ShieldOff className="size-4" aria-hidden /> : <ShieldCheck className="size-4" aria-hidden />}
                      {u.activo ? "Quitar acceso" : "Reactivar"}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {creando && (
        <FormNuevoUsuario
          onCerrar={() => setCreando(false)}
          onCreado={(r) => {
            setCreando(false);
            setAviso(r);
            router.refresh();
          }}
        />
      )}
      {cambiandoClave && (
        <FormPassword
          usuario={cambiandoClave}
          esYo={cambiandoClave.id === usuarioActualId}
          onCerrar={() => setCambiandoClave(null)}
          onListo={(r) => {
            setCambiandoClave(null);
            setAviso(r);
          }}
        />
      )}
    </main>
  );
}

function FormNuevoUsuario({ onCerrar, onCreado }: { onCerrar: () => void; onCreado: (r: Respuesta) => void }) {
  const [estado, accion, pendiente] = useActionState<Respuesta, FormData>(async (prev, fd) => {
    const r = await crearUsuario(prev, fd);
    if (r?.ok) onCreado(r);
    return r;
  }, null);

  return (
    <PanelLateral titulo="Nuevo usuario del comité" descripcion="Podrá ingresar al panel con este correo y contraseña." onCerrar={onCerrar}>
      <form action={accion} className="space-y-4">
        <Campo etiqueta="Nombre completo" htmlFor="nombre" icono={<UserRound />}>
          <input
            id="nombre"
            name="nombre"
            required
            defaultValue={estado?.valores?.nombre}
            autoComplete="off" placeholder="Ana Pérez Ríos" className={`${campo} pl-11`} />
        </Campo>
        <Campo etiqueta="Correo" htmlFor="correo-nuevo" icono={<Mail />}>
          <input
            id="correo-nuevo"
            name="correo"
            type="email"
            required
            defaultValue={estado?.valores?.correo}
            autoComplete="off"
            placeholder="ana.perez@institucion.edu.pe"
            className={`${campo} pl-11`}
          />
        </Campo>
        <fieldset>
          <legend className="mb-1.5 text-sm font-semibold text-marca-900">Rol</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(Object.keys(ROLES) as Rol[]).map((r) => {
              const { nombre, descripcion, Icono } = ROLES[r];
              return (
                <label
                  key={r}
                  className="flex cursor-pointer gap-3 rounded-xl p-3 ring-1 ring-inset ring-slate-300 transition hover:ring-marca-300 has-[:checked]:bg-marca-50 has-[:checked]:ring-2 has-[:checked]:ring-marca-600"
                >
                  <input type="radio" name="rol" value={r} defaultChecked={(estado?.valores?.rol || "OBSERVADOR") === r} className="sr-only" />
                  <Icono className="mt-0.5 size-5 shrink-0 text-marca-600" aria-hidden />
                  <span>
                    <span className="block text-sm font-semibold text-marca-950">{nombre}</span>
                    <span className="block text-xs text-slate-500">{descripcion}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
        <Campo etiqueta="Contraseña inicial" htmlFor="password-nuevo" icono={<Lock />} ayuda={AYUDA_PASSWORD}>
          <CampoPassword id="password-nuevo" name="password" autoComplete="new-password" minLength={8} />
        </Campo>
        {estado && !estado.ok && <Alerta tipo="error">{estado.mensaje}</Alerta>}
        <div className={piePanel}>
          <button type="button" onClick={onCerrar} className={boton.secundario}>
            Cancelar
          </button>
          <button disabled={pendiente} className={boton.primario}>
            {pendiente ? <Loader2 className="size-[18px] animate-spin" aria-hidden /> : <Plus className="size-[18px]" aria-hidden />}
            Registrar usuario
          </button>
        </div>
      </form>
    </PanelLateral>
  );
}

function FormPassword({
  usuario,
  esYo,
  onCerrar,
  onListo,
}: {
  usuario: Usuario;
  esYo: boolean;
  onCerrar: () => void;
  onListo: (r: Respuesta) => void;
}) {
  const [estado, accion, pendiente] = useActionState<Respuesta, FormData>(async (prev, fd) => {
    const r = await restablecerPassword(prev, fd);
    if (r?.ok) onListo({ ok: true, mensaje: esYo ? "Tu contraseña se actualizó." : `Nueva contraseña asignada a ${usuario.nombre}.` });
    return r;
  }, null);

  return (
    <PanelLateral
      titulo={esYo ? "Cambiar tu contraseña" : `Restablecer contraseña`}
      descripcion={esYo ? "Úsala desde tu próximo ingreso." : `Comparte la nueva contraseña con ${usuario.nombre} por un canal seguro.`}
      onCerrar={onCerrar}
    >
      <form action={accion} className="space-y-4">
        <input type="hidden" name="id" value={usuario.id} />
        <Campo etiqueta="Nueva contraseña" htmlFor="password-cambio" icono={<Lock />} ayuda={AYUDA_PASSWORD}>
          <CampoPassword id="password-cambio" name="password" autoComplete="new-password" minLength={8} />
        </Campo>
        {estado && !estado.ok && <Alerta tipo="error">{estado.mensaje}</Alerta>}
        <div className={piePanel}>
          <button type="button" onClick={onCerrar} className={boton.secundario}>
            Cancelar
          </button>
          <button disabled={pendiente} className={boton.primario}>
            {pendiente && <Loader2 className="size-[18px] animate-spin" aria-hidden />}
            Guardar contraseña
          </button>
        </div>
      </form>
    </PanelLateral>
  );
}
