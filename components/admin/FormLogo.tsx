"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import type { Respuesta } from "@/app/admin/acciones";
import { guardarLogo } from "@/app/admin/acciones-eleccion";
import { SubirFoto } from "@/components/admin/SubirFoto";
import { Alerta, boton } from "@/components/ui";

export function FormLogo({ logoUrl }: { logoUrl: string | null }) {
  const router = useRouter();
  const [estado, accion, pendiente] = useActionState<Respuesta, FormData>(async (prev, fd) => {
    const r = await guardarLogo(prev, fd);
    if (r?.ok) router.refresh();
    return r;
  }, null);

  return (
    <form action={accion} className="space-y-3">
      <SubirFoto name="logoUrl" inicial={logoUrl} logo />
      <p className="text-xs text-slate-500">PNG con fondo transparente, de preferencia horizontal. Se muestra sobre un fondo blanco.</p>
      {estado && <Alerta tipo={estado.ok ? "exito" : "error"}>{estado.mensaje}</Alerta>}
      <button disabled={pendiente} className={boton.primario}>
        {pendiente && <Loader2 className="size-4 animate-spin" aria-hidden />}
        Guardar logo
      </button>
    </form>
  );
}
