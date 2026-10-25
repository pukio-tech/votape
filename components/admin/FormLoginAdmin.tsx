"use client";

import { useActionState } from "react";
import { loginAdmin, type Respuesta } from "@/app/admin/acciones";

export function FormLoginAdmin() {
  const [estado, accion, pendiente] = useActionState<Respuesta, FormData>(loginAdmin, null);

  return (
    <form action={accion} className="mt-5 space-y-4">
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3.5 py-2.5 shadow-sm outline-none focus:border-marca-500 focus:ring-4 focus:ring-marca-100"
        />
      </div>
      {estado && !estado.ok && (
        <p role="alert" className="rounded-lg bg-red-50 px-3.5 py-2.5 text-sm text-red-700 ring-1 ring-red-200">
          {estado.mensaje}
        </p>
      )}
      <button
        disabled={pendiente}
        className="w-full rounded-lg bg-marca-700 px-4 py-3 font-semibold text-white hover:bg-marca-800 disabled:opacity-60"
      >
        {pendiente ? "Verificando…" : "Ingresar"}
      </button>
    </form>
  );
}
