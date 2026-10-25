import { redirect } from "next/navigation";
import { FormLoginAdmin } from "@/components/admin/FormLoginAdmin";
import { PantallaAcceso } from "@/components/PantallaAcceso";
import { obtenerAdmin } from "@/lib/sesion";

export default async function LoginAdmin() {
  if (await obtenerAdmin()) redirect("/admin");

  return (
    <PantallaAcceso subtitulo="Acceso restringido" titulo="Comité electoral">
      <h2 className="text-xl font-bold text-marca-950">Iniciar sesión</h2>
      <FormLoginAdmin />
    </PantallaAcceso>
  );
}
