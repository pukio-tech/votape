import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, randomInt } from "node:crypto";

// Sin caracteres ambiguos (0/O, 1/I/L) para facilitar el dictado y la lectura.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const LONGITUD = 10; // ~49 bits de entropía

function pepper(): string {
  const p = process.env.TOKEN_PEPPER;
  if (!p || p.length < 16) {
    throw new Error("TOKEN_PEPPER no está configurado (mínimo 16 caracteres).");
  }
  return p;
}

/** Genera un token legible con formato XXXXX-XXXXX. */
export function generarToken(): string {
  let t = "";
  for (let i = 0; i < LONGITUD; i++) t += ALFABETO[randomInt(ALFABETO.length)];
  return `${t.slice(0, 5)}-${t.slice(5)}`;
}

/** Normaliza lo que escribe el votante: mayúsculas, sin guiones ni espacios. */
export function normalizarToken(token: string): string {
  return token.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Hash con pimienta (HMAC-SHA256). En la BD nunca se guarda el token en claro. */
export function hashToken(token: string): string {
  return createHmac("sha256", pepper()).update(normalizarToken(token)).digest("hex");
}

/** Código de constancia que se le muestra al votante tras sufragar. */
export function generarConstancia(): string {
  let c = "";
  for (let i = 0; i < 12; i++) c += ALFABETO[randomInt(ALFABETO.length)];
  return `${c.slice(0, 4)}-${c.slice(4, 8)}-${c.slice(8)}`;
}

export function sha256(valor: string): string {
  return createHash("sha256").update(valor).digest("hex");
}

// ---------- Copia cifrada para mostrar el token en el panel ----------

/** Clave AES-256 derivada de TOKEN_PEPPER (distinta del uso para el hash). */
function claveCifrado(): Buffer {
  return createHash("sha256").update(`cifrado-token:${pepper()}`).digest();
}

/** Cifra el token con AES-256-GCM. Formato: iv.tag.datos (base64url). */
export function cifrarToken(token: string): string {
  const iv = randomBytes(12);
  const cifrador = createCipheriv("aes-256-gcm", claveCifrado(), iv);
  const datos = Buffer.concat([cifrador.update(token, "utf8"), cifrador.final()]);
  return [iv, cifrador.getAuthTag(), datos].map((b) => b.toString("base64url")).join(".");
}

export function descifrarToken(cifrado: string): string {
  const [iv, tag, datos] = cifrado.split(".").map((p) => Buffer.from(p, "base64url"));
  const descifrador = createDecipheriv("aes-256-gcm", claveCifrado(), iv);
  descifrador.setAuthTag(tag);
  return Buffer.concat([descifrador.update(datos), descifrador.final()]).toString("utf8");
}
