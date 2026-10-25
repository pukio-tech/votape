import {
  CircleCheck,
  CircleX,
  Clock,
  KeyRound,
  LogIn,
  Play,
  ShieldAlert,
  UserCog,
  UserPlus,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ActualizadorAuto } from "@/components/admin/ActualizadorAuto";
import { tarjeta } from "@/components/ui";
import { formatearActualizado } from "@/lib/fechas";
import { prisma } from "@/lib/prisma";
import { obtenerAdmin } from "@/lib/sesion";

type Filtro = { texto: string; eventos?: readonly string[]; excluir?: readonly string[] };

const FILTROS: Record<string, Filtro> = {
  todo: { texto: "Todo" },
  votacion: { texto: "Votación", eventos: ["VOTO_EMITIDO", "INGRESO", "INTENTO_REUSO", "TOKEN_INVALIDO"] },
  alertas: { texto: "Alertas", eventos: ["TOKEN_INVALIDO", "INTENTO_REUSO", "ADMIN_LOGIN_FALLIDO"] },
  comite: { texto: "Comité", excluir: ["VOTO_EMITIDO", "INGRESO", "INTENTO_REUSO", "TOKEN_INVALIDO"] },
};

const ICONOS: Record<string, { Icono: LucideIcon; color: string }> = {
  VOTO_EMITIDO: { Icono: CircleCheck, color: "text-emerald-600 bg-emerald-50" },
  INGRESO: { Icono: LogIn, color: "text-marca-600 bg-marca-50" },
  TOKEN_INVALIDO: { Icono: CircleX, color: "text-red-600 bg-red-50" },
  INTENTO_REUSO: { Icono: ShieldAlert, color: "text-acento-700 bg-acento-50" },
  ADMIN_LOGIN: { Icono: UserCog, color: "text-marca-600 bg-marca-50" },
  ADMIN_LOGIN_FALLIDO: { Icono: ShieldAlert, color: "text-red-600 bg-red-50" },
  CAMBIO_ESTADO: { Icono: Play, color: "text-acento-700 bg-acento-50" },
  CAMBIO_HORARIO: { Icono: Clock, color: "text-acento-700 bg-acento-50" },
  USUARIO_CREADO: { Icono: UserPlus, color: "text-marca-600 bg-marca-50" },
  PASSWORD_CAMBIADA: { Icono: KeyRound, color: "text-marca-600 bg-marca-50" },
};

export default async function Actividad({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  if ((await obtenerAdmin())?.rol !== "ADMIN") redirect("/admin");

  const { tipo } = await searchParams;
  const clave = tipo && tipo in FILTROS ? tipo : "todo";
  const { eventos, excluir } = FILTROS[clave];

  const logs = await prisma.auditoriaLog.findMany({
    where: eventos ? { evento: { in: [...eventos] } } : excluir ? { evento: { notIn: [...excluir] } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-marca-950">Actividad reciente</h2>
          <p className="mt-1 text-sm text-slate-500">Registro de auditoría: ingresos, votos, alertas y acciones del comité.</p>
        </div>
        <ActualizadorAuto />
      </div>

      <nav className="mt-6 flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar actividad">
        {Object.entries(FILTROS).map(([k, f]) => (
          <Link
            key={k}
            href={k === "todo" ? "/admin/actividad" : `/admin/actividad?tipo=${k}`}
            aria-current={k === clave ? "page" : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
              k === clave ? "bg-marca-800 text-white" : "bg-white text-marca-700 ring-1 ring-inset ring-slate-300 hover:ring-marca-300"
            }`}
          >
            {f.texto}
          </Link>
        ))}
      </nav>

      <ol className={`${tarjeta} mt-5 divide-y divide-slate-100`}>
        {logs.length === 0 && <li className="px-5 py-10 text-center text-sm text-slate-500">No hay eventos en esta categoría.</li>}
        {logs.map((l) => {
          const { Icono, color } = ICONOS[l.evento] ?? { Icono: Users, color: "text-slate-500 bg-slate-100" };
          return (
            <li key={l.id} className="flex gap-4 px-5 py-3.5">
              <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-lg ${color}`}>
                <Icono className="size-[18px]" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-marca-950">{l.descripcion}</p>
                <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-slate-400">
                  <span>{formatearActualizado(l.createdAt)}</span>
                  <span className="font-mono">{l.evento}</span>
                  {l.ip && <span>IP {l.ip}</span>}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      {logs.length === 200 && <p className="mt-3 text-center text-xs text-slate-400">Se muestran los 200 eventos más recientes.</p>}
    </main>
  );
}
