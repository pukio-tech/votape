"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import type { Respuesta } from "@/app/admin/acciones";
import { guardarNombrePlataforma } from "@/app/admin/acciones-eleccion";
import { Alerta, boton, campo } from "@/components/ui";

export function FormNombrePlataforma({ nombre }: { nombre: string }) {
  const router = useRouter();
  const [estado, accion, pendiente] = useActionState<Respuesta, FormData>(async (prev, fd) => {
    const r = await guardarNombrePlataforma(prev, fd);
    if (r?.ok) router.refresh();
    return r;
  }, null);

  return (
    <form action={accion} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <label className="flex-1">
          <span className="sr-only">Nombre de la plataforma</span>
          <input name="nombre" required maxLength={40} defaultValue={nombre} className={campo} />
        </label>
        <button disabled={pendiente} className={boton.primario}>
          {pendiente && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Guardar nombre
        </button>
      </div>
      <p className="text-xs text-slate-500">Se muestra en el encabezado, en los ingresos y en la pestaña del navegador.</p>
      {estado && <Alerta tipo={estado.ok ? "exito" : "error"}>{estado.mensaje}</Alerta>}
    </form>
  );
}
