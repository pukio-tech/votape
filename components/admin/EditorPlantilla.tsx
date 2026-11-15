"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { Fragment, useActionState, useRef, useState } from "react";
import { guardarPlantillaWhatsapp, type RespuestaVotante } from "@/app/admin/acciones-votantes";
import { PanelLateral, piePanel } from "@/components/PanelLateral";
import { Alerta, boton, campo } from "@/components/ui";
import { aplicarPlantilla, EJEMPLO_PLANTILLA, PLANTILLA_POR_DEFECTO, VARIABLES_PLANTILLA } from "@/lib/plantilla";

/** Muestra *negrita* como lo hace WhatsApp. */
function ConNegritas({ texto }: { texto: string }) {
  return (
    <>
      {texto.split(/(\*[^*\n]+\*)/g).map((parte, i) =>
        /^\*[^*\n]+\*$/.test(parte) ? <strong key={i}>{parte.slice(1, -1)}</strong> : <Fragment key={i}>{parte}</Fragment>,
      )}
    </>
  );
}

export function EditorPlantilla({ plantilla, onCerrar }: { plantilla: string; onCerrar: () => void }) {
  const [texto, setTexto] = useState(plantilla);
  const area = useRef<HTMLTextAreaElement>(null);
  const [estado, accion, pendiente] = useActionState<RespuestaVotante, FormData>(guardarPlantillaWhatsapp, null);

  /** Inserta la variable donde está el cursor. */
  function insertar(clave: string) {
    const el = area.current;
    const variable = `{${clave}}`;
    if (!el) return setTexto((t) => t + variable);
    const { selectionStart: a, selectionEnd: b } = el;
    setTexto(texto.slice(0, a) + variable + texto.slice(b));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + variable.length, a + variable.length);
    });
  }

  return (
    <PanelLateral titulo="Mensaje de WhatsApp" descripcion="Es el texto que se envía con el acceso de cada votante." onCerrar={onCerrar}>
      <form action={accion} className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-semibold text-marca-900">Insertar dato</p>
          <div className="flex flex-wrap gap-2">
            {VARIABLES_PLANTILLA.map((v) => (
              <button
                key={v.clave}
                type="button"
                onClick={() => insertar(v.clave)}
                title={v.descripcion}
                className="rounded-full bg-marca-50 px-3 py-1.5 font-mono text-xs font-semibold text-marca-700 ring-1 ring-inset ring-marca-100 hover:bg-marca-100"
              >
                {`{${v.clave}}`}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {VARIABLES_PLANTILLA.map((v) => `{${v.clave}} = ${v.descripcion.toLowerCase()}`).join(" · ")}. Usa *asteriscos* para negrita.
          </p>
        </div>

        <label className="block text-sm font-semibold text-marca-900">
          Mensaje
          <textarea
            ref={area}
            name="plantilla"
            rows={9}
            maxLength={1000}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className={`${campo} mt-1.5 font-mono text-sm leading-relaxed`}
          />
          <span className="mt-1 flex justify-between text-xs font-normal text-slate-400">
            <button type="button" onClick={() => setTexto(PLANTILLA_POR_DEFECTO)} className="inline-flex items-center gap-1 hover:text-marca-700">
              <RotateCcw className="size-3.5" aria-hidden /> Usar mensaje por defecto
            </button>
            {texto.length}/1000
          </span>
        </label>

        <div>
          <p className="mb-2 text-sm font-semibold text-marca-900">Vista previa</p>
          <div className="rounded-lg bg-[#e7ddd4] p-3">
            <div className="ml-auto max-w-[90%] whitespace-pre-wrap break-words rounded-lg rounded-tr-none bg-[#d9fdd3] px-3 py-2 text-sm text-slate-900 shadow-sm">
              <ConNegritas texto={aplicarPlantilla(texto, EJEMPLO_PLANTILLA)} />
            </div>
          </div>
          {!texto.includes("{token}") && <p className="mt-2 text-sm text-red-600">Falta {"{token}"}: el votante no recibiría su acceso.</p>}
        </div>

        {estado && <Alerta tipo={estado.ok ? "exito" : "error"}>{estado.mensaje}</Alerta>}
        <div className={piePanel}>
          <button type="button" onClick={onCerrar} className={boton.secundario}>
            Cerrar
          </button>
          <button disabled={pendiente} className={boton.primario}>
            {pendiente && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Guardar mensaje
          </button>
        </div>
      </form>
    </PanelLateral>
  );
}
