"use client";

import { BarChart3, CalendarClock, ScrollText, UserCheck, Users, Vote } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ENLACES = [
  { href: "/admin", texto: "Resultados", Icono: BarChart3, soloAdmin: false },
  { href: "/admin/jornada", texto: "Jornada", Icono: CalendarClock, soloAdmin: true },
  { href: "/admin/candidatos", texto: "Candidatos", Icono: Vote, soloAdmin: true },
  { href: "/admin/votantes", texto: "Votantes", Icono: UserCheck, soloAdmin: true },
  { href: "/admin/actividad", texto: "Actividad", Icono: ScrollText, soloAdmin: true },
  { href: "/admin/usuarios", texto: "Usuarios", Icono: Users, soloAdmin: true },
] as const;

export function NavAdmin({ esAdmin }: { esAdmin: boolean }) {
  const ruta = usePathname();
  return (
    <nav className="border-t border-white/10 bg-marca-900" aria-label="Secciones del panel">
      <div className="mx-auto flex max-w-6xl overflow-x-auto px-2 sm:px-4">
        {ENLACES.filter((e) => esAdmin || !e.soloAdmin).map(({ href, texto, Icono }) => {
          const activo = ruta === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={activo ? "page" : undefined}
              ref={activo ? (el) => el?.scrollIntoView({ block: "nearest", inline: "center" }) : undefined}
              className={`flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-semibold transition ${
                activo ? "bg-marca-600 text-white" : "text-marca-200 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icono className="size-4" aria-hidden />
              {texto}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
