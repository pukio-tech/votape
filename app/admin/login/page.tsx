import { redirect } from "next/navigation";
import { Encabezado } from "@/components/Encabezado";
import { FormLoginAdmin } from "@/components/admin/FormLoginAdmin";
import { esAdmin } from "@/lib/sesion";

export default async function LoginAdmin() {
  if (await esAdmin()) redirect("/admin");

  return (
    <>
      <Encabezado titulo="Panel del comité electoral" subtitulo="Administración" />
      <main className="flex flex-1 items-start justify-center px-4 py-12 sm:items-center">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Acceso restringido</h2>
          <p className="mt-1 text-sm text-slate-500">Solo para miembros del comité electoral.</p>
          <FormLoginAdmin />
        </div>
      </main>
    </>
  );
}
