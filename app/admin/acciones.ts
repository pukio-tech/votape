"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { desdeInputLocal, formatearFecha } from "@/lib/fechas";
import { limitar, obtenerIp } from "@/lib/peticion";
import { prisma } from "@/lib/prisma";
import { obtenerProceso, registrarLog } from "@/lib/proceso";
import { cerrarSesionAdmin, esAdmin, iniciarSesionAdmin, passwordAdminValida } from "@/lib/sesion";

export type Respuesta = { ok: boolean; mensaje: string } | null;

export async function loginAdmin(_prev: Respuesta, formData: FormData): Promise<Respuesta> {
  const ip = await obtenerIp();
  if (!limitar(`admin:${ip}`, 5, 15 * 60 * 1000)) {
    return { ok: false, mensaje: "Demasiados intentos. Espera 15 minutos." };
  }
  if (!passwordAdminValida(String(formData.get("password") ?? ""))) {
    await registrarLog("ADMIN_LOGIN_FALLIDO", "Contraseña de administrador incorrecta.", ip);
    return { ok: false, mensaje: "Contraseña incorrecta." };
  }
  await iniciarSesionAdmin();
  await registrarLog("ADMIN_LOGIN", "Ingreso al panel de administración.", ip);
  redirect("/admin");
}

export async function salirAdmin() {
  await cerrarSesionAdmin();
  redirect("/admin/login");
}

async function procesoAutorizado() {
  if (!(await esAdmin())) throw new Error("No autorizado");
  const proceso = await obtenerProceso();
  if (!proceso) throw new Error("No hay proceso electoral.");
  return proceso;
}

const esquemaHorario = z.object({
  inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Fecha de inicio inválida."),
  cierre: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Fecha de cierre inválida."),
});

export async function guardarHorario(_prev: Respuesta, formData: FormData): Promise<Respuesta> {
  const proceso = await procesoAutorizado();
  const datos = esquemaHorario.safeParse({ inicio: formData.get("inicio"), cierre: formData.get("cierre") });
  if (!datos.success) return { ok: false, mensaje: datos.error.issues[0].message };

  const fechaInicio = desdeInputLocal(datos.data.inicio);
  const fechaCierre = desdeInputLocal(datos.data.cierre);
  if (fechaCierre <= fechaInicio) return { ok: false, mensaje: "El cierre debe ser posterior al inicio." };

  await prisma.procesoElectoral.update({ where: { id: proceso.id }, data: { fechaInicio, fechaCierre } });
  await registrarLog(
    "CAMBIO_HORARIO",
    `Horario: ${formatearFecha(fechaInicio)} → ${formatearFecha(fechaCierre)}.`,
    await obtenerIp(),
    proceso.id,
  );
  return { ok: true, mensaje: "Horario actualizado." };
}

const DESCRIPCION_ESTADO = {
  CONFIGURACION: "Votación pausada / en configuración.",
  EN_PROCESO: "Votación activada.",
  FINALIZADO: "Votación finalizada.",
} as const;

export async function cambiarEstado(estado: keyof typeof DESCRIPCION_ESTADO): Promise<Respuesta> {
  const proceso = await procesoAutorizado();
  if (!(estado in DESCRIPCION_ESTADO)) return { ok: false, mensaje: "Estado no válido." };

  await prisma.procesoElectoral.update({ where: { id: proceso.id }, data: { estado } });
  await registrarLog("CAMBIO_ESTADO", DESCRIPCION_ESTADO[estado], await obtenerIp(), proceso.id);
  return { ok: true, mensaje: DESCRIPCION_ESTADO[estado] };
}
