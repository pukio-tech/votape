import "server-only";
import { redirect } from "next/navigation";
import { obtenerAdmin, type Admin } from "./sesion";

/** Todas las acciones de escritura del panel son exclusivas del rol ADMIN. */
export async function exigirAdmin(): Promise<Admin> {
  const admin = await obtenerAdmin();
  if (!admin) redirect("/admin/login");
  if (admin.rol !== "ADMIN") redirect("/admin");
  return admin;
}
