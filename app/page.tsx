import { connection } from "next/server";
import { Encabezado } from "@/components/Encabezado";
import { FormIngreso } from "@/components/FormIngreso";
import { formatearFecha } from "@/lib/fechas";
import { estadoVotacion, obtenerProceso } from "@/lib/proceso";

export default async function Inicio() {
  await connection();
  const proceso = await obtenerProceso();
  const estado = estadoVotacion(proceso);

  return (
    <>
      <Encabezado titulo={proceso?.titulo ?? "Votación Estudiantil"} subtitulo={proceso?.institucion} />
      <main className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
        <div className="w-full max-w-md">
          <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="border-b border-slate-100 px-6 pb-5 pt-6">
              <h2 className="text-xl font-semibold text-slate-900">Ingreso a la cédula de votación</h2>
              <p className="mt-1 text-sm text-slate-500">
                Ingresa tu código de estudiante y el token personal que te entregó el comité electoral.
              </p>
              {proceso && (
                <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-3 text-xs">
                  <div>
                    <dt className="font-medium text-slate-500">Apertura</dt>
                    <dd className="mt-0.5 text-slate-800">{formatearFecha(proceso.fechaInicio)}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-500">Cierre</dt>
                    <dd className="mt-0.5 text-slate-800">{formatearFecha(proceso.fechaCierre)}</dd>
                  </div>
                </dl>
              )}
            </div>

            <div className="px-6 py-6">
              {estado.abierta ? (
                <FormIngreso />
              ) : (
                <Aviso
                  titulo={
                    estado.motivo === "CERRADA"
                      ? "La votación ha finalizado"
                      : estado.motivo === "NO_INICIADA"
                        ? "La votación aún no ha iniciado"
                        : "No hay un proceso electoral configurado"
                  }
                  texto={
                    estado.motivo === "CERRADA"
                      ? "Gracias por tu participación. Los resultados serán publicados por el comité electoral."
                      : estado.motivo === "NO_INICIADA"
                        ? "Vuelve a ingresar dentro del horario indicado arriba."
                        : "Contacta con el comité electoral."
                  }
                />
              )}
            </div>
          </div>

          <ul className="mt-6 space-y-2 px-1 text-xs text-slate-500">
            <li className="flex gap-2"><Punto /> Tu voto es secreto: el sistema no vincula tu identidad con tu elección.</li>
            <li className="flex gap-2"><Punto /> Cada token permite votar una sola vez y se desactiva al confirmar.</li>
          </ul>
        </div>
      </main>
    </>
  );
}

function Aviso({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
      <p className="font-semibold">{titulo}</p>
      <p className="mt-1 text-sm">{texto}</p>
    </div>
  );
}

function Punto() {
  return <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-marca-500" aria-hidden />;
}
