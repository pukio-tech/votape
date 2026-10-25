import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const LONGITUD_CLAVE = 64;

function derivar(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, LONGITUD_CLAVE, { N: 16384, r: 8, p: 1 }, (err, clave) => (err ? reject(err) : resolve(clave))),
  );
}

/** Hash con scrypt y sal aleatoria. Formato: scrypt$<sal>$<hash> (base64url). */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const clave = await derivar(password, salt);
  return `scrypt$${salt.toString("base64url")}$${clave.toString("base64url")}`;
}

export async function verificarPassword(password: string, almacenado: string): Promise<boolean> {
  const [algoritmo, salt, hash] = almacenado.split("$");
  if (algoritmo !== "scrypt" || !salt || !hash) return false;
  const esperado = Buffer.from(hash, "base64url");
  const clave = await derivar(password, Buffer.from(salt, "base64url"));
  return clave.length === esperado.length && timingSafeEqual(clave, esperado);
}

/** Hash fijo para comparar cuando el correo no existe y no revelar por tiempo de respuesta. */
export const HASH_SENUELO = "scrypt$AAAAAAAAAAAAAAAAAAAAAA$" + "A".repeat(86);
