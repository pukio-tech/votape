"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { guardarProceso } from "@/app/admin/acciones-eleccion";
import type { Respuesta } from "@/app/admin/acciones";
import { Alerta, boton, campo } from "@/components/ui";

/** Crea el proceso (con horario) o edita su título e institución. */
export function FormProceso({ proceso }: { proceso?: { titulo: string; institucion: string | null } }) {
  const router = useRouter();
  const [estado, accion, pendiente] = useActionState<Respuesta, FormData>(async (prev, fd) => {
    const r = await guardarProceso(prev, fd);
    if (r?.ok) router.refresh();
    return r;
  }, null);
  const creando = !proceso;

  return (
    <form action={accion} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-marca-900">
          Título de la elección
          <input
            name="titulo"
            required
            defaultValue={proceso?.titulo}
            placeholder="Elecciones Consejo Estudiantil 2026"
            className={`${campo} mt-1.5`}
          />
        </label>
        <label className="block text-sm font-semibold text-marca-900">
          Institución
          <input name="institucion" defaultValue={proceso?.institucion ?? ""} placeholder="Universidad Nacional de San Martín" className={`${campo} mt-1.5`} />
        </label>
        {creando && (
          <>
            <label className="block text-sm font-semibold text-marca-900">
              Apertura (hora de Lima)
              <input type="datetime-local" name="inicio" required className={`${campo} mt-1.5`} />
            </label>
            <label className="block text-sm font-semibold text-marca-900">
              Cierre (hora de Lima)
              <input type="datetime-local" name="cierre" required className={`${campo} mt-1.5`} />
            </label>
          </>
        )}
      </div>
      {estado && <Alerta tipo={estado.ok ? "exito" : "error"}>{estado.mensaje}</Alerta>}
      <button disabled={pendiente} className={`${boton.primario} w-full sm:w-auto`}>
        {pendiente && <Loader2 className="size-4 animate-spin" aria-hidden />}
        {creando ? "Crear proceso electoral" : "Guardar datos"}
      </button>
    </form>
  );
}
