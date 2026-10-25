"use client";

import { ArrowRight, KeyRound, Loader2, Lock, UserRound } from "lucide-react";
import { useActionState, useState } from "react";
import { ingresar, type EstadoIngreso } from "@/app/acciones";
import { formatearFecha } from "@/lib/fechas";
import { Alerta, Campo, boton, campo } from "./ui";

/** Formatea lo que se escribe como XXXXX-XXXXX (mayúsculas, sin caracteres extra). */
function mascaraToken(valor: string): string {
  const limpio = valor.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  return limpio.length > 5 ? `${limpio.slice(0, 5)}-${limpio.slice(5)}` : limpio;
}

export function FormIngreso() {
  const [estado, accion, pendiente] = useActionState<EstadoIngreso, FormData>(ingresar, { tipo: "inicial" });
  const [token, setToken] = useState("");

  if (estado.tipo === "bloqueado") {
    return (
      <div className="animate-aparecer text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100">
          <Lock className="size-7" aria-hidden />
        </div>
        <h3 className="mt-4 text-lg font-bold text-marca-950">
          {estado.motivo === "USADO" ? "Este token ya fue utilizado" : "Este token fue anulado"}
        </h3>
        <p className="mx-auto mt-2 max-w-xs text-sm text-slate-600">
          {estado.motivo === "USADO"
            ? `Tu voto quedó registrado${estado.fecha ? ` el ${formatearFecha(estado.fecha)}` : ""}. Cada estudiante vota una sola vez.`
            : "Comunícate con el comité electoral para regularizar tu acceso."}
        </p>
        <button type="button" onClick={() => window.location.reload()} className={`${boton.secundario} mt-6 w-full`}>
          Volver al inicio
        </button>
      </div>
    );
  }

  return (
    <form action={accion} className="space-y-5">
      <Campo etiqueta="Código de estudiante" htmlFor="codigo" icono={<UserRound />}>
        <input
          id="codigo"
          name="codigo"
          required
          defaultValue={estado.tipo === "error" ? estado.codigo : undefined}
          inputMode="numeric"
          autoComplete="off"
          placeholder="2026100001"
          className={`${campo} pl-11`}
        />
      </Campo>

      <Campo etiqueta="Token de acceso" htmlFor="token" icono={<KeyRound />}>
        <input
          id="token"
          name="token"
          required
          value={token}
          onChange={(e) => setToken(mascaraToken(e.target.value))}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="XXXXX-XXXXX"
          className={`${campo} pl-11 font-mono text-lg tracking-[0.2em] placeholder:tracking-[0.2em]`}
        />
      </Campo>

      {estado.tipo === "error" && <Alerta tipo="error">{estado.mensaje}</Alerta>}

      <button type="submit" disabled={pendiente} className={`${boton.primario} w-full py-3.5 text-base`}>
        {pendiente ? (
          <>
            <Loader2 className="size-5 animate-spin" aria-hidden /> Verificando
          </>
        ) : (
          <>
            Ingresar a votar <ArrowRight className="size-5" aria-hidden />
          </>
        )}
      </button>
    </form>
  );
}
