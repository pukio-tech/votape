import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE_VOTANTE = "vp_votante";
const COOKIE_ADMIN = "vp_admin";
const TTL_VOTANTE_MS = 20 * 60 * 1000; // 20 minutos para completar la cédula
const TTL_ADMIN_MS = 8 * 60 * 60 * 1000;

type Payload = { sub: string; exp: number };

function secreto(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) {
    throw new Error("SESSION_SECRET no está configurado (mínimo 32 caracteres).");
  }
  return s;
}

function firmar(payload: Payload): string {
  const cuerpo = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const firma = createHmac("sha256", secreto()).update(cuerpo).digest("base64url");
  return `${cuerpo}.${firma}`;
}

function verificar(valor: string | undefined): Payload | null {
  if (!valor) return null;
  const [cuerpo, firma] = valor.split(".");
  if (!cuerpo || !firma) return null;
  const esperada = createHmac("sha256", secreto()).update(cuerpo).digest();
  const recibida = Buffer.from(firma, "base64url");
  if (recibida.length !== esperada.length || !timingSafeEqual(recibida, esperada)) return null;
  try {
    const payload = JSON.parse(Buffer.from(cuerpo, "base64url").toString()) as Payload;
    return payload.exp > Date.now() ? payload : null;
  } catch {
    return null;
  }
}

const opcionesCookie = (maxAgeMs: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  maxAge: Math.floor(maxAgeMs / 1000),
});

export async function iniciarSesionVotante(votanteId: string) {
  const jar = await cookies();
  jar.set(COOKIE_VOTANTE, firmar({ sub: votanteId, exp: Date.now() + TTL_VOTANTE_MS }), opcionesCookie(TTL_VOTANTE_MS));
}

export async function obtenerVotanteSesion(): Promise<string | null> {
  const jar = await cookies();
  return verificar(jar.get(COOKIE_VOTANTE)?.value)?.sub ?? null;
}

export async function cerrarSesionVotante() {
  (await cookies()).delete(COOKIE_VOTANTE);
}

export async function iniciarSesionAdmin() {
  const jar = await cookies();
  jar.set(COOKIE_ADMIN, firmar({ sub: "admin", exp: Date.now() + TTL_ADMIN_MS }), opcionesCookie(TTL_ADMIN_MS));
}

export async function esAdmin(): Promise<boolean> {
  const jar = await cookies();
  return verificar(jar.get(COOKIE_ADMIN)?.value)?.sub === "admin";
}

export async function cerrarSesionAdmin() {
  (await cookies()).delete(COOKIE_ADMIN);
}

/** Compara la contraseña del admin en tiempo constante. */
export function passwordAdminValida(intento: string): boolean {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) return false;
  const a = createHmac("sha256", secreto()).update(intento).digest();
  const b = createHmac("sha256", secreto()).update(real).digest();
  return timingSafeEqual(a, b);
}
