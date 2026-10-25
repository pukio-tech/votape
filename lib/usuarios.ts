import { prisma } from "./prisma";
import { hashPassword } from "./password";

export const CORREO_ADMIN_POR_DEFECTO = "admin@admin.com";

/**
 * Crea el administrador inicial a partir de ADMIN_EMAIL / ADMIN_PASSWORD si todavía
 * no existe ningún usuario del comité. Devuelve el usuario creado o null.
 */
export async function asegurarAdminInicial() {
  if ((await prisma.usuarioAdmin.count()) > 0) return null;
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error("Define ADMIN_PASSWORD (mínimo 8 caracteres) para crear el administrador inicial.");
  }
  return prisma.usuarioAdmin.create({
    data: {
      nombre: "Administrador",
      rol: "ADMIN",
      correo: (process.env.ADMIN_EMAIL || CORREO_ADMIN_POR_DEFECTO).toLowerCase(),
      passwordHash: await hashPassword(password),
    },
  });
}
