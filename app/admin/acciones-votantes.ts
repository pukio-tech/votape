"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { exigirAdmin } from "@/lib/autorizacion";
import { parsearCsv, registrarPadron, validarPadron } from "@/lib/padron";
import { obtenerIp } from "@/lib/peticion";
import { prisma } from "@/lib/prisma";
import { registrarLog } from "@/lib/proceso";
import { generarToken, hashToken } from "@/lib/tokens";

/** Respuesta de las acciones de votantes. `token` solo viaja una vez, al generarlo. */
export type RespuestaVotante = {
  ok: boolean;
  mensaje: string;
  token?: { codigo: string; nombre: string; valor: string };
  tokens?: Record<string, string>[];
  errores?: string[];
} | null;

const refrescar = () => {
  revalidatePath("/admin/votantes");
  revalidatePath("/admin/jornada");
};

const opcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

const esquemaVotante = z.object({
  codigoEstudiante: z.string().trim().min(1, "Ingresa el código de estudiante.").max(30),
  dni: opcional(15).refine((v) => !v || /^\d{8,12}$/.test(v), "El DNI debe tener solo números (8 a 12 dígitos)."),
  nombres: z.string().trim().min(1, "Ingresa los nombres.").max(80),
  apellidos: z.string().trim().min(1, "Ingresa los apellidos.").max(80),
  correo: opcional(160).refine((v) => !v || z.string().email().safeParse(v).success, "Correo no válido."),
});

export async function guardarVotante(_prev: RespuestaVotante, formData: FormData): Promise<RespuestaVotante> {
  const admin = await exigirAdmin();
  const datos = esquemaVotante.safeParse({
    codigoEstudiante: formData.get("codigoEstudiante"),
    dni: formData.get("dni") ?? "",
    nombres: formData.get("nombres"),
    apellidos: formData.get("apellidos"),
    correo: formData.get("correo") ?? "",
  });
  if (!datos.success) return { ok: false, mensaje: datos.error.issues[0].message };
  const id = String(formData.get("id") ?? "");

  const repetido = await prisma.votante.findUnique({ where: { codigoEstudiante: datos.data.codigoEstudiante } });
  if (repetido && repetido.id !== id) return { ok: false, mensaje: "Ya existe un votante con ese código." };

  if (id) {
    await prisma.votante.update({ where: { id }, data: datos.data });
    await registrarLog("VOTANTE_EDITADO", `${admin.nombre} editó al votante ${datos.data.codigoEstudiante}.`, await obtenerIp());
    refrescar();
    return { ok: true, mensaje: "Votante actualizado." };
  }

  const token = generarToken();
  await prisma.votante.create({ data: { ...datos.data, token: { create: { tokenHash: hashToken(token) } } } });
  await registrarLog("VOTANTE_CREADO", `${admin.nombre} registró al votante ${datos.data.codigoEstudiante}.`, await obtenerIp());
  refrescar();
  return {
    ok: true,
    mensaje: "Votante registrado.",
    token: { codigo: datos.data.codigoEstudiante, nombre: `${datos.data.nombres} ${datos.data.apellidos}`, valor: token },
  };
}

export async function eliminarVotante(id: string): Promise<RespuestaVotante> {
  const admin = await exigirAdmin();
  const votante = await prisma.votante.findUnique({ where: { id }, include: { participacion: true } });
  if (!votante) return { ok: false, mensaje: "El votante no existe." };
  if (votante.participacion) return { ok: false, mensaje: "No se puede eliminar a un votante que ya votó." };

  await prisma.votante.delete({ where: { id } });
  await registrarLog("VOTANTE_ELIMINADO", `${admin.nombre} eliminó al votante ${votante.codigoEstudiante}.`, await obtenerIp());
  refrescar();
  return { ok: true, mensaje: `Votante ${votante.codigoEstudiante} eliminado.` };
}

/** Genera un token nuevo (reemplaza al anterior). No aplica si el votante ya votó. */
export async function regenerarToken(id: string): Promise<RespuestaVotante> {
  const admin = await exigirAdmin();
  const votante = await prisma.votante.findUnique({ where: { id }, include: { token: true } });
  if (!votante) return { ok: false, mensaje: "El votante no existe." };
  if (votante.token?.estado === "USADO") return { ok: false, mensaje: "Este votante ya votó; su token no se puede regenerar." };

  const token = generarToken();
  await prisma.tokenAcceso.upsert({
    where: { votanteId: id },
    create: { votanteId: id, tokenHash: hashToken(token) },
    update: { tokenHash: hashToken(token), estado: "PENDIENTE", fechaGeneracion: new Date() },
  });
  await registrarLog("TOKEN_REGENERADO", `${admin.nombre} generó un token nuevo para ${votante.codigoEstudiante}.`, await obtenerIp());
  refrescar();
  return {
    ok: true,
    mensaje: "Token generado. El anterior ya no funciona.",
    token: { codigo: votante.codigoEstudiante, nombre: `${votante.nombres} ${votante.apellidos}`, valor: token },
  };
}

export async function anularToken(id: string): Promise<RespuestaVotante> {
  const admin = await exigirAdmin();
  const votante = await prisma.votante.findUnique({ where: { id }, include: { token: true } });
  if (!votante?.token) return { ok: false, mensaje: "El votante no tiene token." };
  if (votante.token.estado !== "PENDIENTE") return { ok: false, mensaje: "Solo se pueden anular tokens pendientes." };

  await prisma.tokenAcceso.update({ where: { votanteId: id }, data: { estado: "ANULADO" } });
  await registrarLog("TOKEN_ANULADO", `${admin.nombre} anuló el token de ${votante.codigoEstudiante}.`, await obtenerIp());
  refrescar();
  return { ok: true, mensaje: `Token de ${votante.codigoEstudiante} anulado. Genera uno nuevo para devolverle el acceso.` };
}

export async function importarVotantes(_prev: RespuestaVotante, formData: FormData): Promise<RespuestaVotante> {
  const admin = await exigirAdmin();
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return { ok: false, mensaje: "Elige un archivo CSV." };
  if (archivo.size > 900 * 1024) return { ok: false, mensaje: "El archivo es muy grande (máx. 900 KB). Divídelo en partes." };

  const { padron, errores } = validarPadron(parsearCsv(await archivo.text()));
  if (errores.length) return { ok: false, mensaje: "Corrige el archivo antes de importar.", errores: errores.slice(0, 20) };
  if (padron.length === 0) return { ok: false, mensaje: "El archivo no tiene filas de votantes." };

  const tokens = await registrarPadron(padron);
  await registrarLog(
    "PADRON_IMPORTADO",
    `${admin.nombre} importó ${padron.length} votantes (${tokens.length} tokens nuevos).`,
    await obtenerIp(),
  );
  refrescar();
  return {
    ok: true,
    mensaje: `${padron.length} votantes procesados · ${tokens.length} tokens nuevos.`,
    tokens,
  };
}
