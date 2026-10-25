import { BarChart3 } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { EstadoJornada, type FaseJornada } from "@/components/EstadoJornada";
import { FormIngreso } from "@/components/FormIngreso";
import { PantallaAcceso } from "@/components/PantallaAcceso";
import { Alerta } from "@/components/ui";
import { estadoVotacion, obtenerProceso } from "@/lib/proceso";

export default async function Inicio() {
  await connection();
  const proceso = await obtenerProceso();
  const estado = estadoVotacion(proceso);
  const fase: FaseJornada = estado.abierta ? "ABIERTA" : estado.motivo;

  return (
    <PantallaAcceso
      subtitulo={proceso?.institucion}
      titulo={proceso?.titulo ?? "Votación estudiantil"}
      estado={<EstadoJornada fase={fase} inicio={proceso?.fechaInicio.toISOString()} cierre={proceso?.fechaCierre.toISOString()} />}
    >
      <h2 className="text-xl font-bold text-marca-950">Ingresa a votar</h2>

      <div className="mt-5">
        {estado.abierta ? (
          <FormIngreso />
        ) : estado.motivo === "CERRADA" ? (
          <Alerta tipo="info" titulo="La votación ha finalizado" />
        ) : estado.motivo === "NO_INICIADA" ? (
          <Alerta tipo="aviso" titulo="La votación aún no ha iniciado" />
        ) : (
          <Alerta tipo="info" titulo="No hay un proceso electoral activo" />
        )}
      </div>

      <Link
        href="/resultados"
        className="mt-6 flex items-center justify-center gap-2 border-t border-slate-200 pt-5 text-sm font-semibold text-marca-600 hover:text-marca-800"
      >
        <BarChart3 className="size-4" aria-hidden /> Ver resultados en vivo
      </Link>
    </PantallaAcceso>
  );
}
