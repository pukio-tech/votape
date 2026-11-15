import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { redirect } from "next/navigation";
import { salirAdmin } from "@/app/admin/acciones";
import { NavAdmin } from "@/components/admin/NavAdmin";
import { Logo } from "@/components/ui";
import { obtenerAjustes } from "@/lib/ajustes";
import { obtenerAdmin } from "@/lib/sesion";

export default async function LayoutPanel({ children }: { children: ReactNode }) {
  const [admin, { nombrePlataforma, logoUrl }] = await Promise.all([obtenerAdmin(), obtenerAjustes()]);
  if (!admin) redirect("/admin/login");

  const iniciales = admin.nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-30 bg-marca-800 text-white shadow-sm shadow-marca-950/20">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Logo nombre={nombrePlataforma} logoUrl={logoUrl} claro />
          <span className="hidden h-6 w-px bg-white/15 sm:block" aria-hidden />
          <span className="hidden text-sm font-medium text-marca-200 sm:block">Comité electoral</span>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right leading-tight md:block">
              <p className="text-sm font-semibold">{admin.nombre}</p>
              <p className="text-xs text-marca-300">{admin.rol === "ADMIN" ? "Administrador" : "Observador"} · {admin.correo}</p>
            </div>
            <span className="grid size-9 place-items-center rounded-full bg-acento-400 text-sm font-bold text-marca-950" aria-hidden>
              {iniciales}
            </span>
            <form action={salirAdmin}>
              <button
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
                className="grid size-9 place-items-center rounded-xl text-marca-200 ring-1 ring-white/15 transition hover:bg-white/10 hover:text-white"
              >
                <LogOut className="size-[18px]" />
              </button>
            </form>
          </div>
        </div>
        <NavAdmin esAdmin={admin.rol === "ADMIN"} />
      </header>
      {children}
    </>
  );
}
