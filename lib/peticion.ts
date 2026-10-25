import "server-only";
import { headers } from "next/headers";

export async function obtenerIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconocida";
}

type Ventana = { intentos: number; reinicio: number };
const ventanas = new Map<string, Ventana>();

/**
 * Limitador de intentos en memoria (por instancia del servidor). Suficiente para
 * frenar fuerza bruta sobre tokens en un despliegue de una sola instancia.
 */
export function limitar(clave: string, maximo: number, ventanaMs: number): boolean {
  const ahora = Date.now();
  const v = ventanas.get(clave);
  if (!v || v.reinicio < ahora) {
    ventanas.set(clave, { intentos: 1, reinicio: ahora + ventanaMs });
    return true;
  }
  v.intentos++;
  return v.intentos <= maximo;
}
