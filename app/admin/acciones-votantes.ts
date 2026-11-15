"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { obtenerAjustes } from "@/lib/ajustes";
import { exigirAdmin } from "@/lib/autorizacion";
import { asignarToken, parsearCsv, registrarPadron, validarPadron } from "@/lib/padron";
import { obtenerIp } from "@/lib/peticion";
import { aplicarPlantilla, PLANTILLA_POR_DEFECTO } from "@/lib/plantilla";
import { prisma } from "@/lib/prisma";
import { obtenerProceso, registrarLog } from "@/lib/proceso";
import { celularValido, enlaceWhatsapp, normalizarCelular } from "@/lib/telefono";
import { descifrarToken, generarToken } from "@/lib/tokens";

/** Respuesta de las acciones de votantes. `token` solo viaja una vez, al generarlo. */
export type RespuestaVotante = {
  ok: boolean;
  mensaje: string;
  token?: { codigo: string; nombre: string; valor: string };
  tokens?: Record<string, string>[];
  enlace?: string;
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
  celular: opcional(20)
    .transform((v) => normalizarCelular(v))
    .refine((v) => !v || celularValido(v), "El celular debe tener 9 dígitos (o el código de país y el número)."),
});

export async function guardarVotante(_prev: RespuestaVotante, formData: FormData): Promise<RespuestaVotante> {
  const admin = await exigirAdmin();
  const datos = esquemaVotante.safeParse({
    codigoEstudiante: formData.get("codigoEstudiante"),
    dni: formData.get("dni") ?? "",
    nombres: formData.get("nombres"),
    apellidos: formData.get("apellidos"),
    correo: formData.get("correo") ?? "",
    celular: formData.get("celular") ?? "",
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
  const creado = await prisma.votante.create({ data: datos.data });
  await asignarToken(creado.id, token);
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
  await asignarToken(id, token);
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

/** Muestra el token vigente de un votante. Queda registrado en la auditoría. */
export async function verToken(id: string): Promise<RespuestaVotante> {
  const admin = await exigirAdmin();
  const votante = await prisma.votante.findUnique({ where: { id }, include: { token: true, entrega: true } });
  if (!votante?.token) return { ok: false, mensaje: "Este votante no tiene token. Genera uno." };
  if (!votante.entrega) return { ok: false, mensaje: "Este token se creó antes de guardar copias. Genera uno nuevo para verlo." };

  await registrarLog("TOKEN_VISTO", `${admin.nombre} consultó el token de ${votante.codigoEstudiante}.`, await obtenerIp());
  return {
    ok: true,
    mensaje: "",
    token: { codigo: votante.codigoEstudiante, nombre: `${votante.nombres} ${votante.apellidos}`, valor: descifrarToken(votante.entrega.cifrado) },
  };
}

/** Lista para descargar con los tokens pendientes de todo el padrón. Queda registrado en la auditoría. */
export async function exportarTokens(): Promise<RespuestaVotante> {
  const admin = await exigirAdmin();
  const votantes = await prisma.votante.findMany({
    where: { token: { is: { estado: "PENDIENTE" } }, entrega: { isNot: null } },
    orderBy: [{ apellidos: "asc" }, { nombres: "asc" }],
    include: { entrega: true },
  });
  if (votantes.length === 0) return { ok: false, mensaje: "No hay tokens pendientes para descargar." };

  await registrarLog("TOKEN_EXPORTADO", `${admin.nombre} descargó ${votantes.length} tokens pendientes.`, await obtenerIp());
  return {
    ok: true,
    mensaje: `${votantes.length} tokens descargados.`,
    tokens: votantes.map((v) => ({
      codigo: v.codigoEstudiante,
      apellidos: v.apellidos,
      nombres: v.nombres,
      correo: v.correo ?? "",
      token: descifrarToken(v.entrega!.cifrado),
    })),
  };
}

/**
 * Arma el enlace de WhatsApp con el código, el token y la dirección para votar.
 * El comité solo tiene que pulsar "Enviar". Queda registrado en la auditoría.
 */
export async function mensajeWhatsapp(id: string): Promise<RespuestaVotante> {
  const admin = await exigirAdmin();
  const votante = await prisma.votante.findUnique({ where: { id }, include: { token: true, entrega: true } });
  if (!votante) return { ok: false, mensaje: "El votante no existe." };
  if (!votante.celular) return { ok: false, mensaje: "Este votante no tiene celular registrado. Edítalo para agregarlo." };
  if (votante.token?.estado === "USADO") return { ok: false, mensaje: "Este votante ya votó." };
  if (votante.token?.estado !== "PENDIENTE" || !votante.entrega) {
    return { ok: false, mensaje: "Este votante no tiene un token vigente. Genera uno nuevo." };
  }

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const protocolo = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const [proceso, { plantillaWhatsapp }] = await Promise.all([obtenerProceso(), obtenerAjustes()]);
  const mensaje = aplicarPlantilla(plantillaWhatsapp, {
    nombre: `${votante.nombres} ${votante.apellidos}`,
    nombres: votante.nombres,
    codigo: votante.codigoEstudiante,
    token: descifrarToken(votante.entrega.cifrado),
    enlace: `${protocolo}://${host}`,
    eleccion: proceso?.titulo ?? "",
  });

  await registrarLog("TOKEN_WHATSAPP", `${admin.nombre} preparó el envío por WhatsApp del token de ${votante.codigoEstudiante}.`, await obtenerIp());
  return { ok: true, mensaje: "", enlace: enlaceWhatsapp(votante.celular, mensaje) };
}

/** Guarda la plantilla del mensaje de WhatsApp. Vacía = vuelve a la plantilla por defecto. */
export async function guardarPlantillaWhatsapp(_prev: RespuestaVotante, formData: FormData): Promise<RespuestaVotante> {
  const admin = await exigirAdmin();
  const texto = String(formData.get("plantilla") ?? "").replace(/\r\n/g, "\n").trim();
  if (texto.length > 1000) return { ok: false, mensaje: "El mensaje admite hasta 1000 caracteres." };
  if (texto && !texto.includes("{token}")) return { ok: false, mensaje: "El mensaje debe incluir {token}; si no, el votante no recibe su acceso." };

  const plantillaWhatsapp = texto && texto !== PLANTILLA_POR_DEFECTO ? texto : null;
  await prisma.ajustes.upsert({
    where: { id: "general" },
    create: { id: "general", plantillaWhatsapp },
    update: { plantillaWhatsapp },
  });
  await registrarLog("AJUSTES_EDITADOS", `${admin.nombre} ${plantillaWhatsapp ? "editó" : "restableció"} el mensaje de WhatsApp.`, await obtenerIp());
  revalidatePath("/admin/votantes");
  return { ok: true, mensaje: plantillaWhatsapp ? "Mensaje guardado." : "Se restableció el mensaje por defecto." };
}
