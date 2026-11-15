import { Ban, KeyRound, Users, Vote } from "lucide-react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ControlJornada } from "@/components/admin/ControlJornada";
import { FormLogo } from "@/components/admin/FormLogo";
import { FormNombrePlataforma } from "@/components/admin/FormNombrePlataforma";
import { FormProceso } from "@/components/admin/FormProceso";
import { tarjeta } from "@/components/ui";
import { obtenerAjustes } from "@/lib/ajustes";
import { prisma } from "@/lib/prisma";
import { obtenerProceso } from "@/lib/proceso";
import { obtenerAdmin } from "@/lib/sesion";

export default async function Jornada() {
  if ((await obtenerAdmin())?.rol !== "ADMIN") redirect("/admin");

  const [proceso, padron, votaron, tokens, { nombrePlataforma, logoUrl }] = await Promise.all([
    obtenerProceso(),
    prisma.votante.count(),
    prisma.registroParticipacion.count(),
    prisma.tokenAcceso.groupBy({ by: ["estado"], _count: { _all: true } }),
    obtenerAjustes(),
  ]);
  if (!proceso) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <h2 className="text-2xl font-bold text-marca-950">Crea el proceso electoral</h2>
        <p className="mt-1 text-sm text-slate-500">Define el título y el horario de la votación.</p>
        <div className={`${tarjeta} mt-6 p-5 sm:p-6`}>
          <FormProceso />
        </div>
      </main>
    );
  }
  const porEstado = Object.fromEntries(tokens.map((t) => [t.estado, t._count._all]));

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <h2 className="text-2xl font-bold tracking-tight text-marca-950">Control de la jornada</h2>
      <p className="mt-1 text-sm text-slate-500">Activa, pausa o finaliza la votación y ajusta el horario de apertura y cierre.</p>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Padrón y tokens">
        <Indicador icono={<Users />} etiqueta="Electores en el padrón" valor={padron} />
        <Indicador icono={<Vote />} etiqueta="Ya votaron" valor={votaron} tono="verde" />
        <Indicador icono={<KeyRound />} etiqueta="Tokens pendientes" valor={porEstado.PENDIENTE ?? 0} tono="ambar" />
        <Indicador icono={<Ban />} etiqueta="Tokens anulados" valor={porEstado.ANULADO ?? 0} tono="rojo" />
      </section>

      <ControlJornada
        proceso={{
          estado: proceso.estado,
          fechaInicio: proceso.fechaInicio.toISOString(),
          fechaCierre: proceso.fechaCierre.toISOString(),
        }}
        ahora={new Date().toISOString()}
      />

      <section className={`${tarjeta} mt-6 p-5 sm:p-6`}>
        <h3 className="font-bold text-marca-950">Datos del proceso</h3>
        <div className="mt-4">
          <FormProceso proceso={{ titulo: proceso.titulo, institucion: proceso.institucion }} />
        </div>
      </section>

      <section className={`${tarjeta} mt-6 p-5 sm:p-6`}>
        <h3 className="font-bold text-marca-950">Identidad de la plataforma</h3>
        <div className="mt-4 grid gap-8 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold text-marca-900">Nombre</p>
            <FormNombrePlataforma nombre={nombrePlataforma} />
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-marca-900">Logo</p>
            <FormLogo logoUrl={logoUrl} />
          </div>
        </div>
      </section>
    </main>
  );
}

const TONOS = {
  marca: "bg-marca-50 text-marca-600",
  verde: "bg-emerald-50 text-emerald-600",
  ambar: "bg-amber-50 text-amber-600",
  rojo: "bg-red-50 text-red-600",
};

function Indicador({ icono, etiqueta, valor, tono = "marca" }: { icono: ReactNode; etiqueta: string; valor: number; tono?: keyof typeof TONOS }) {
  return (
    <div className={`${tarjeta} flex items-center gap-4 p-5`}>
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl [&>svg]:size-5 ${TONOS[tono]}`}>{icono}</span>
      <div>
        <p className="text-sm font-medium text-slate-500">{etiqueta}</p>
        <p className="text-2xl font-bold tabular-nums tracking-tight text-marca-950">{valor.toLocaleString("es-PE")}</p>
      </div>
    </div>
  );
}
