"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { desdeInputLocal, formatearFecha } from "@/lib/fechas";
import { HASH_SENUELO, hashPassword, verificarPassword } from "@/lib/password";
import { limitar, obtenerIp } from "@/lib/peticion";
import { prisma } from "@/lib/prisma";
import { obtenerProceso, registrarLog } from "@/lib/proceso";
import { exigirAdmin } from "@/lib/autorizacion";
import { cerrarSesionAdmin, iniciarSesionAdmin } from "@/lib/sesion";
import { asegurarAdminInicial } from "@/lib/usuarios";

export type Respuesta = { ok: boolean; mensaje: string; valores?: Record<string, string> } | null;

// ---------- Sesión ----------

const esquemaLogin = z.object({
  correo: z.string().trim().toLowerCase().email("Ingresa un correo válido."),
  password: z.string().min(1, "Ingresa tu contraseña.").max(200),
});

export async function loginAdmin(_prev: Respuesta, formData: FormData): Promise<Respuesta> {
  const ip = await obtenerIp();
  const datos = esquemaLogin.safeParse({ correo: formData.get("correo"), password: formData.get("password") });
  const valores = { correo: String(formData.get("correo") ?? "") };
  if (!datos.success) return { ok: false, mensaje: datos.error.issues[0].message, valores };
  const { correo, password } = datos.data;

  if (!limitar(`admin:${ip}`, 8, 15 * 60 * 1000) || !limitar(`admin:${correo}`, 5, 15 * 60 * 1000)) {
    return { ok: false, mensaje: "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.", valores };
  }

  // Primer arranque: si no hay usuarios, se crea el administrador definido en el .env.
  await asegurarAdminInicial().catch(() => null);

  const usuario = await prisma.usuarioAdmin.findUnique({ where: { correo } });
  // Siempre se calcula un hash para no revelar por tiempo si el correo existe.
  const valida = await verificarPassword(password, usuario?.passwordHash ?? HASH_SENUELO);
  if (!usuario || !valida || !usuario.activo) {
    await registrarLog("ADMIN_LOGIN_FALLIDO", `Intento fallido con ${correo}.`, ip);
    return { ok: false, mensaje: "Correo o contraseña incorrectos.", valores };
  }

  await prisma.usuarioAdmin.update({ where: { id: usuario.id }, data: { ultimoAcceso: new Date() } });
  await iniciarSesionAdmin(usuario.id);
  await registrarLog("ADMIN_LOGIN", `${usuario.nombre} ingresó al panel.`, ip);
  redirect("/admin");
}

export async function salirAdmin() {
  await cerrarSesionAdmin();
  redirect("/admin/login");
}


/** Evita que el panel quede sin ningún administrador activo. */
async function quedaOtroAdmin(exceptoId: string) {
  return (await prisma.usuarioAdmin.count({ where: { rol: "ADMIN", activo: true, id: { not: exceptoId } } })) > 0;
}

const NOMBRE_ROL = { ADMIN: "Administrador", OBSERVADOR: "Observador" } as const;

// ---------- Jornada electoral ----------

async function procesoAutorizado() {
  const admin = await exigirAdmin();
  const proceso = await obtenerProceso();
  if (!proceso) throw new Error("No hay proceso electoral.");
  return { admin, proceso };
}

const esquemaHorario = z.object({
  inicio: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Fecha de inicio inválida."),
  cierre: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Fecha de cierre inválida."),
});

export async function guardarHorario(_prev: Respuesta, formData: FormData): Promise<Respuesta> {
  const { admin, proceso } = await procesoAutorizado();
  const datos = esquemaHorario.safeParse({ inicio: formData.get("inicio"), cierre: formData.get("cierre") });
  if (!datos.success) return { ok: false, mensaje: datos.error.issues[0].message };

  const fechaInicio = desdeInputLocal(datos.data.inicio);
  const fechaCierre = desdeInputLocal(datos.data.cierre);
  if (fechaCierre <= fechaInicio) return { ok: false, mensaje: "El cierre debe ser posterior al inicio." };

  await prisma.procesoElectoral.update({ where: { id: proceso.id }, data: { fechaInicio, fechaCierre } });
  await registrarLog(
    "CAMBIO_HORARIO",
    `${admin.nombre} fijó el horario: ${formatearFecha(fechaInicio)} → ${formatearFecha(fechaCierre)}.`,
    await obtenerIp(),
    proceso.id,
  );
  revalidatePath("/admin/jornada");
  return { ok: true, mensaje: "Horario actualizado." };
}

const DESCRIPCION_ESTADO = {
  CONFIGURACION: "pausó la votación",
  EN_PROCESO: "activó la votación",
  FINALIZADO: "finalizó la votación",
} as const;

const MENSAJE_ESTADO = {
  CONFIGURACION: "Votación en pausa.",
  EN_PROCESO: "Votación activada.",
  FINALIZADO: "Votación finalizada.",
} as const;

export async function cambiarEstado(estado: keyof typeof DESCRIPCION_ESTADO): Promise<Respuesta> {
  const { admin, proceso } = await procesoAutorizado();
  if (!(estado in DESCRIPCION_ESTADO)) return { ok: false, mensaje: "Estado no válido." };

  await prisma.procesoElectoral.update({ where: { id: proceso.id }, data: { estado } });
  await registrarLog("CAMBIO_ESTADO", `${admin.nombre} ${DESCRIPCION_ESTADO[estado]}.`, await obtenerIp(), proceso.id);
  revalidatePath("/admin/jornada");
  return { ok: true, mensaje: MENSAJE_ESTADO[estado] };
}

// ---------- Usuarios del comité ----------

const esquemaPassword = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres.")
  .max(200)
  .regex(/[A-Za-z]/, "La contraseña debe incluir letras.")
  .regex(/\d/, "La contraseña debe incluir al menos un número.");

const esquemaUsuario = z.object({
  nombre: z.string().trim().min(2, "Ingresa el nombre completo.").max(120),
  correo: z.string().trim().toLowerCase().email("Ingresa un correo válido.").max(160),
  password: esquemaPassword,
  rol: z.enum(["ADMIN", "OBSERVADOR"], { message: "Elige un rol." }),
});

export async function crearUsuario(_prev: Respuesta, formData: FormData): Promise<Respuesta> {
  const admin = await exigirAdmin();
  const datos = esquemaUsuario.safeParse({
    nombre: formData.get("nombre"),
    correo: formData.get("correo"),
    password: formData.get("password"),
    rol: formData.get("rol"),
  });
  // Se devuelven los valores para que el formulario no se vacíe al mostrar el error.
  const valores = {
    nombre: String(formData.get("nombre") ?? ""),
    correo: String(formData.get("correo") ?? ""),
    rol: String(formData.get("rol") ?? ""),
  };
  if (!datos.success) return { ok: false, mensaje: datos.error.issues[0].message, valores };

  const existe = await prisma.usuarioAdmin.findUnique({ where: { correo: datos.data.correo } });
  if (existe) return { ok: false, mensaje: "Ya existe un usuario con ese correo.", valores };

  await prisma.usuarioAdmin.create({
    data: {
      nombre: datos.data.nombre,
      correo: datos.data.correo,
      rol: datos.data.rol,
      passwordHash: await hashPassword(datos.data.password),
    },
  });
  await registrarLog(
    "USUARIO_CREADO",
    `${admin.nombre} registró a ${datos.data.nombre} (${datos.data.correo}) como ${NOMBRE_ROL[datos.data.rol]}.`,
    await obtenerIp(),
  );
  revalidatePath("/admin/usuarios");
  return { ok: true, mensaje: `${datos.data.nombre} ya puede ingresar al panel.` };
}

export async function cambiarAccesoUsuario(id: string, activo: boolean): Promise<Respuesta> {
  const admin = await exigirAdmin();
  if (id === admin.id && !activo) return { ok: false, mensaje: "No puedes desactivar tu propia cuenta." };

  const usuario = await prisma.usuarioAdmin.findUnique({ where: { id } });
  if (!usuario) return { ok: false, mensaje: "El usuario no existe." };
  if (!activo && usuario.rol === "ADMIN" && !(await quedaOtroAdmin(id))) {
    return { ok: false, mensaje: "Debe quedar al menos un administrador activo." };
  }

  await prisma.usuarioAdmin.update({ where: { id }, data: { activo } });
  await registrarLog(
    activo ? "USUARIO_ACTIVADO" : "USUARIO_DESACTIVADO",
    `${admin.nombre} ${activo ? "reactivó" : "desactivó"} el acceso de ${usuario.nombre}.`,
    await obtenerIp(),
  );
  revalidatePath("/admin/usuarios");
  return { ok: true, mensaje: activo ? `${usuario.nombre} recuperó el acceso.` : `${usuario.nombre} ya no puede ingresar.` };
}

export async function restablecerPassword(_prev: Respuesta, formData: FormData): Promise<Respuesta> {
  const admin = await exigirAdmin();
  const id = String(formData.get("id") ?? "");
  const password = esquemaPassword.safeParse(formData.get("password"));
  if (!password.success) return { ok: false, mensaje: password.error.issues[0].message };

  const usuario = await prisma.usuarioAdmin.findUnique({ where: { id } });
  if (!usuario) return { ok: false, mensaje: "El usuario no existe." };

  await prisma.usuarioAdmin.update({ where: { id }, data: { passwordHash: await hashPassword(password.data) } });
  await registrarLog(
    "PASSWORD_CAMBIADA",
    id === admin.id ? `${admin.nombre} cambió su contraseña.` : `${admin.nombre} restableció la contraseña de ${usuario.nombre}.`,
    await obtenerIp(),
  );
  return { ok: true, mensaje: "Contraseña actualizada." };
}

export async function cambiarRol(id: string, rol: "ADMIN" | "OBSERVADOR"): Promise<Respuesta> {
  const admin = await exigirAdmin();
  if (!(rol in NOMBRE_ROL)) return { ok: false, mensaje: "Rol no válido." };
  if (id === admin.id) return { ok: false, mensaje: "No puedes cambiar tu propio rol." };

  const usuario = await prisma.usuarioAdmin.findUnique({ where: { id } });
  if (!usuario) return { ok: false, mensaje: "El usuario no existe." };
  if (usuario.rol === rol) return { ok: true, mensaje: `${usuario.nombre} ya es ${NOMBRE_ROL[rol]}.` };

  await prisma.usuarioAdmin.update({ where: { id }, data: { rol } });
  await registrarLog("CAMBIO_ROL", `${admin.nombre} cambió el rol de ${usuario.nombre} a ${NOMBRE_ROL[rol]}.`, await obtenerIp());
  revalidatePath("/admin/usuarios");
  return { ok: true, mensaje: `${usuario.nombre} ahora es ${NOMBRE_ROL[rol]}.` };
}
