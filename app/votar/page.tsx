import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import { Cedula } from "@/components/Cedula";
import { Encabezado } from "@/components/Encabezado";
import { salir } from "@/app/acciones";
import { prisma } from "@/lib/prisma";
import { estadoVotacion, obtenerProceso } from "@/lib/proceso";
import { obtenerVotanteSesion } from "@/lib/sesion";

export default async function Votar() {
  const votanteId = await obtenerVotanteSesion();
  if (!votanteId) redirect("/");

  const [votante, proceso] = await Promise.all([
    prisma.votante.findUnique({ where: { id: votanteId }, include: { token: true } }),
    obtenerProceso(),
  ]);
  if (!votante || votante.token?.estado !== "PENDIENTE" || !proceso || !estadoVotacion(proceso).abierta) {
    redirect("/");
  }

  const cargos = await prisma.cargo.findMany({
    where: { procesoId: proceso.id },
    orderBy: { orden: "asc" },
    select: {
      id: true,
      nombre: true,
      maxSelecciones: true,
      candidatos: {
        orderBy: { nombreCompleto: "asc" },
        select: { id: true, nombreCompleto: true, fotoUrl: true, propuestaResumen: true },
      },
    },
  });

  return (
    <>
      <Encabezado
        titulo={proceso.titulo}
        subtitulo={proceso.institucion}
        accion={
          <form action={salir}>
            <button className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-marca-100 ring-1 ring-white/15 transition hover:bg-white/10 hover:text-white">
              <LogOut className="size-4" aria-hidden /> <span className="hidden sm:inline">Salir</span>
            </button>
          </form>
        }
      />
      <Cedula votante={`${votante.nombres} ${votante.apellidos}`} codigo={votante.codigoEstudiante} foto={votante.fotoUrl} cargos={cargos} />
    </>
  );
}
