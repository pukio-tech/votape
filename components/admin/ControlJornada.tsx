"use client";

import { CalendarClock, Loader2, Pause, Play, Power, RotateCcw, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { cambiarEstado, guardarHorario, type Respuesta } from "@/app/admin/acciones";
import { PanelLateral } from "@/components/PanelLateral";
import { Alerta, Insignia, boton, campo, tarjeta } from "@/components/ui";
import { aInputLocal, formatearFecha } from "@/lib/fechas";

type Proceso = { estado: "CONFIGURACION" | "EN_PROCESO" | "FINALIZADO"; fechaInicio: string; fechaCierre: string };
type AccionEstado = { nuevo: Proceso["estado"]; titulo: string; texto: string; boton: string; estilo: string };

function EstadoActual({ proceso, ahora }: { proceso: Proceso; ahora: number }) {
  const { estado, fechaInicio, fechaCierre } = proceso;
  if (estado === "FINALIZADO" || (estado === "EN_PROCESO" && ahora > Date.parse(fechaCierre))) {
    return <Insignia color="rojo" punto>Votación cerrada</Insignia>;
  }
  if (estado === "EN_PROCESO" && ahora < Date.parse(fechaInicio)) return <Insignia color="ambar" punto>Programada</Insignia>;
  if (estado === "EN_PROCESO") return <Insignia color="verde" punto>Votación abierta</Insignia>;
  return <Insignia color="gris" punto>En pausa</Insignia>;
}

export function ControlJornada({ proceso, ahora }: { proceso: Proceso; ahora: string }) {
  const router = useRouter();
  const [horario, accionHorario, guardando] = useActionState<Respuesta, FormData>(async (prev, fd) => {
    const r = await guardarHorario(prev, fd);
    router.refresh();
    return r;
  }, null);
  const [mensajeEstado, setMensajeEstado] = useState<Respuesta>(null);
  const [confirmando, setConfirmando] = useState<AccionEstado | null>(null);
  const [cambiando, startTransition] = useTransition();
  const { estado } = proceso;

  function aplicar(accion: AccionEstado) {
    startTransition(async () => {
      setMensajeEstado(await cambiarEstado(accion.nuevo));
      setConfirmando(null);
      router.refresh();
    });
  }

  const activar: AccionEstado = {
    nuevo: "EN_PROCESO",
    titulo: estado === "FINALIZADO" ? "¿Reabrir la votación?" : "¿Activar la votación?",
    texto: "Los electores podrán ingresar y votar dentro del horario configurado.",
    boton: estado === "FINALIZADO" ? "Reabrir votación" : "Activar votación",
    estilo: boton.exito,
  };
  const pausar: AccionEstado = {
    nuevo: "CONFIGURACION",
    titulo: "¿Pausar la votación?",
    texto: "Nadie podrá ingresar hasta que la reactives. Los votos ya emitidos se conservan.",
    boton: "Pausar votación",
    estilo: boton.primario,
  };
  const finalizar: AccionEstado = {
    nuevo: "FINALIZADO",
    titulo: "¿Finalizar la votación?",
    texto: "Se cerrará el acceso a todos los electores. Usa esta opción al terminar la jornada.",
    boton: "Finalizar votación",
    estilo: boton.peligro,
  };

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <section className={`${tarjeta} p-5 sm:p-6`}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-bold text-marca-950">
            <Power className="size-5 text-marca-500" aria-hidden /> Estado de la votación
          </h3>
          <EstadoActual proceso={proceso} ahora={Date.parse(ahora)} />
        </div>
        <p className="mt-3 text-sm text-slate-600">
          La votación solo acepta votos cuando está activada <strong>y</strong> la hora actual está dentro del horario.
        </p>

        <div className="mt-5 grid gap-2">
          {estado !== "EN_PROCESO" ? (
            <button onClick={() => setConfirmando(activar)} className={boton.exito}>
              {estado === "FINALIZADO" ? <RotateCcw className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}
              {activar.boton}
            </button>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              <button onClick={() => setConfirmando(pausar)} className={boton.secundario}>
                <Pause className="size-4" aria-hidden /> Pausar votación
              </button>
              <button onClick={() => setConfirmando(finalizar)} className={boton.peligro}>
                <Square className="size-4" aria-hidden /> Finalizar votación
              </button>
            </div>
          )}
          {mensajeEstado && <Alerta tipo={mensajeEstado.ok ? "exito" : "error"}>{mensajeEstado.mensaje}</Alerta>}
        </div>
      </section>

      <section className={`${tarjeta} p-5 sm:p-6`}>
        <h3 className="flex items-center gap-2 font-bold text-marca-950">
          <CalendarClock className="size-5 text-marca-500" aria-hidden /> Horario <span className="text-sm font-normal text-slate-500">(hora de Lima)</span>
        </h3>
        <form action={accionHorario} className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-marca-900">
              Apertura
              <input type="datetime-local" name="inicio" required defaultValue={aInputLocal(proceso.fechaInicio)} className={`${campo} mt-1.5`} />
            </label>
            <label className="block text-sm font-semibold text-marca-900">
              Cierre
              <input type="datetime-local" name="cierre" required defaultValue={aInputLocal(proceso.fechaCierre)} className={`${campo} mt-1.5`} />
            </label>
          </div>
          <p className="text-xs text-slate-500">
            Vigente: {formatearFecha(proceso.fechaInicio)} — {formatearFecha(proceso.fechaCierre)}
          </p>
          {horario && <Alerta tipo={horario.ok ? "exito" : "error"}>{horario.mensaje}</Alerta>}
          <button disabled={guardando} className={`${boton.primario} w-full sm:w-auto`}>
            {guardando && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Guardar horario
          </button>
        </form>
      </section>

      {confirmando && (
        <PanelLateral
          titulo={confirmando.titulo}
          descripcion={confirmando.texto}
          onCerrar={() => !cambiando && setConfirmando(null)}
          pie={
            <>
              <button onClick={() => setConfirmando(null)} disabled={cambiando} className={boton.secundario}>
                Cancelar
              </button>
              <button onClick={() => aplicar(confirmando)} disabled={cambiando} className={confirmando.estilo}>
                {cambiando && <Loader2 className="size-4 animate-spin" aria-hidden />}
                {confirmando.boton}
              </button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Horario vigente: {formatearFecha(proceso.fechaInicio)} — {formatearFecha(proceso.fechaCierre)}.
          </p>
        </PanelLateral>
      )}
    </div>
  );
}
