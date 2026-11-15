import { redirect } from "next/navigation";
import { FormProceso } from "@/components/admin/FormProceso";
import { GestionCandidatos } from "@/components/admin/GestionCandidatos";
import { tarjeta } from "@/components/ui";
import { prisma } from "@/lib/prisma";
import { obtenerProceso } from "@/lib/proceso";
import { obtenerAdmin } from "@/lib/sesion";

export default async function Candidatos() {
  if ((await obtenerAdmin())?.rol !== "ADMIN") redirect("/admin");
  const proceso = await obtenerProceso();

  if (!proceso) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6">
        <h2 className="text-2xl font-bold text-marca-950">Crea el proceso electoral</h2>
        <p className="mt-1 text-sm text-slate-500">Luego podrás registrar los cargos y sus candidatos.</p>
        <div className={`${tarjeta} mt-6 p-5 sm:p-6`}>
          <FormProceso />
        </div>
      </main>
    );
  }

  const [cargos, votos] = await Promise.all([
    prisma.cargo.findMany({
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
    }),
    prisma.voto.count({ where: { procesoId: proceso.id } }),
  ]);

  return <GestionCandidatos cargos={cargos} hayVotos={votos > 0} />;
}
