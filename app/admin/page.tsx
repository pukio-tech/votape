import { redirect } from "next/navigation";
import { Encabezado } from "@/components/Encabezado";
import { PanelAdmin } from "@/components/admin/PanelAdmin";
import { salirAdmin } from "@/app/admin/acciones";
import { calcularResultados } from "@/lib/resultados";
import { esAdmin } from "@/lib/sesion";

export default async function Admin() {
  if (!(await esAdmin())) redirect("/admin/login");
  const resultados = await calcularResultados();

  return (
    <>
      <Encabezado
        titulo={resultados?.proceso.titulo ?? "Panel del comité electoral"}
        subtitulo="Panel de administración"
        accion={
          <form action={salirAdmin}>
            <button className="rounded-lg px-3 py-1.5 text-sm font-medium text-marca-100 ring-1 ring-white/25 hover:bg-white/10">
              Cerrar sesión
            </button>
          </form>
        }
      />
      {resultados ? (
        <PanelAdmin inicial={resultados} />
      ) : (
        <main className="mx-auto max-w-xl px-4 py-12 text-center text-slate-600">
          <p className="font-semibold text-slate-900">Aún no hay un proceso electoral.</p>
          <p className="mt-2 text-sm">
            Cárgalo con <code className="rounded bg-slate-100 px-1.5 py-0.5">npm run eleccion:cargar -- datos/eleccion.json</code>
          </p>
        </main>
      )}
    </>
  );
}
