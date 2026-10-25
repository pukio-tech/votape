/**
 * Crea un administrador del panel, o restablece su contraseña (y lo deja como ADMIN activo) si el correo ya existe
 * (útil si se pierde el acceso al panel).
 *
 *   npm run admin:crear                                         → usa ADMIN_EMAIL / ADMIN_PASSWORD del .env
 *   npm run admin:crear -- --correo x@unsm.edu.pe --nombre "Ana Pérez" --password Clave2026
 */
import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";
import { CORREO_ADMIN_POR_DEFECTO } from "../lib/usuarios";

function argumento(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const correo = (argumento("correo") ?? process.env.ADMIN_EMAIL ?? CORREO_ADMIN_POR_DEFECTO).trim().toLowerCase();
  const nombre = argumento("nombre") ?? "Administrador";
  const password = argumento("password") ?? process.env.ADMIN_PASSWORD;
  if (!password || password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");

  const passwordHash = await hashPassword(password);
  const existente = await prisma.usuarioAdmin.findUnique({ where: { correo } });
  if (existente) {
    await prisma.usuarioAdmin.update({ where: { correo }, data: { passwordHash, activo: true, rol: "ADMIN" } });
    console.log(`✔ Contraseña restablecida y acceso activo para ${correo}.`);
  } else {
    await prisma.usuarioAdmin.create({ data: { nombre, correo, passwordHash, rol: "ADMIN" } });
    console.log(`✔ Usuario ${nombre} <${correo}> creado.`);
  }
}

main()
  .catch((e) => {
    console.error("✖", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
