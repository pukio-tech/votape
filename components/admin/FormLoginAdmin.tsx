"use client";

import { ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import { useActionState } from "react";
import { loginAdmin, type Respuesta } from "@/app/admin/acciones";
import { CampoPassword } from "@/components/CampoPassword";
import { Alerta, Campo, boton, campo } from "@/components/ui";

export function FormLoginAdmin() {
  const [estado, accion, pendiente] = useActionState<Respuesta, FormData>(loginAdmin, null);

  return (
    <form action={accion} className="mt-7 space-y-5">
      <Campo etiqueta="Correo" htmlFor="correo" icono={<Mail />}>
        <input
          id="correo"
          name="correo"
          type="email"
          required
          defaultValue={estado?.valores?.correo}
          autoComplete="username"
          placeholder="nombre@institucion.edu.pe"
          className={`${campo} pl-11`}
        />
      </Campo>
      <Campo etiqueta="Contraseña" htmlFor="password" icono={<Lock />}>
        <CampoPassword id="password" name="password" autoComplete="current-password" />
      </Campo>

      {estado && !estado.ok && <Alerta tipo="error">{estado.mensaje}</Alerta>}

      <button disabled={pendiente} className={`${boton.primario} w-full py-3.5 text-base`}>
        {pendiente ? (
          <>
            <Loader2 className="size-5 animate-spin" aria-hidden /> Verificando
          </>
        ) : (
          <>
            Ingresar al panel <ArrowRight className="size-5" aria-hidden />
          </>
        )}
      </button>
    </form>
  );
}
