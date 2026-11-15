import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { GestionVotantes } from "@/components/admin/GestionVotantes";
import { prisma } from "@/lib/prisma";
import { obtenerAdmin } from "@/lib/sesion";

const POR_PAGINA = 20;
const ESTADOS = ["PENDIENTE", "USADO", "ANULADO", "SIN_TOKEN"] as const;

export default async function Votantes({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; estado?: string; pagina?: string }>;
}) {
  if ((await obtenerAdmin())?.rol !== "ADMIN") redirect("/admin");

  const params = await searchParams;
  const q = (params.q ?? "").trim().slice(0, 60);
  const estado = (ESTADOS as readonly string[]).includes(params.estado ?? "") ? (params.estado as (typeof ESTADOS)[number]) : "";
  const pagina = Math.max(1, Number.parseInt(params.pagina ?? "1", 10) || 1);

  const where: Prisma.VotanteWhereInput = {
    ...(q && {
      OR: [
        { codigoEstudiante: { contains: q, mode: "insensitive" } },
        { dni: { contains: q } },
        { nombres: { contains: q, mode: "insensitive" } },
        { apellidos: { contains: q, mode: "insensitive" } },
        { correo: { contains: q, mode: "insensitive" } },
      ],
    }),
    ...(estado === "SIN_TOKEN" ? { token: { is: null } } : estado ? { token: { is: { estado } } } : {}),
  };

  const [total, votantes, porEstado, padron] = await Promise.all([
    prisma.votante.count({ where }),
    prisma.votante.findMany({
      where,
      orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      select: {
        id: true,
        codigoEstudiante: true,
        dni: true,
        nombres: true,
        apellidos: true,
        correo: true,
        token: { select: { estado: true, fechaUso: true } },
        entrega: { select: { id: true } },
      },
    }),
    prisma.tokenAcceso.groupBy({ by: ["estado"], _count: { _all: true } }),
    prisma.votante.count(),
  ]);
  const conteo = Object.fromEntries(porEstado.map((t) => [t.estado, t._count._all]));

  return (
    <GestionVotantes
      votantes={votantes.map((v) => ({
        ...v,
        estado: v.token?.estado ?? null,
        tieneCopia: Boolean(v.entrega),
        fechaUso: v.token?.fechaUso?.toISOString() ?? null,
      }))}
      filtros={{ q, estado, pagina }}
      total={total}
      paginas={Math.max(1, Math.ceil(total / POR_PAGINA))}
      resumen={{
        padron,
        pendientes: conteo.PENDIENTE ?? 0,
        votaron: conteo.USADO ?? 0,
        anulados: conteo.ANULADO ?? 0,
      }}
    />
  );
}
