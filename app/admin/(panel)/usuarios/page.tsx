import { redirect } from "next/navigation";
import { GestionUsuarios } from "@/components/admin/GestionUsuarios";
import { prisma } from "@/lib/prisma";
import { obtenerAdmin } from "@/lib/sesion";

export default async function Usuarios() {
  const admin = await obtenerAdmin();
  if (admin?.rol !== "ADMIN") redirect("/admin");

  const usuarios = await prisma.usuarioAdmin.findMany({
    orderBy: [{ activo: "desc" }, { rol: "asc" }, { createdAt: "asc" }],
    select: { id: true, nombre: true, correo: true, rol: true, activo: true, ultimoAcceso: true, createdAt: true },
  });

  return (
    <GestionUsuarios
      usuarioActualId={admin.id}
      usuarios={usuarios.map((u) => ({
        ...u,
        ultimoAcceso: u.ultimoAcceso?.toISOString() ?? null,
        createdAt: u.createdAt.toISOString(),
      }))}
    />
  );
}
