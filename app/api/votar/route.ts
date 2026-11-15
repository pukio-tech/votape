import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { obtenerIp } from "@/lib/peticion";
import { cerrarSesionVotante, obtenerVotanteSesion } from "@/lib/sesion";
import { emitirVoto, VotoError } from "@/lib/votacion";

// Por cada cargo, uno o varios candidatos (los cargos con maxSelecciones > 1 envían una lista).
const idCandidato = z.string().max(40);
const esquema = z.object({
  selecciones: z.record(
    z.string().max(40),
    z.union([idCandidato, z.array(idCandidato).max(20)]).transform((v) => (Array.isArray(v) ? v : [v])),
  ),
});

const ESTADO_HTTP = { ELECCION_CERRADA: 403, CEDULA_INVALIDA: 400, TOKEN_NO_DISPONIBLE: 409 } as const;

export async function POST(request: NextRequest) {
  // Protección CSRF adicional a la cookie SameSite=strict.
  const origen = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origen && new URL(origen).host !== host) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }

  const votanteId = await obtenerVotanteSesion();
  if (!votanteId) {
    return NextResponse.json({ error: "Tu sesión expiró. Vuelve a ingresar con tu token." }, { status: 401 });
  }

  const cuerpo = esquema.safeParse(await request.json().catch(() => null));
  if (!cuerpo.success) {
    return NextResponse.json({ error: "Cédula con formato inválido." }, { status: 400 });
  }

  try {
    const { constancia, fecha } = await emitirVoto(votanteId, cuerpo.data.selecciones, await obtenerIp());
    await cerrarSesionVotante();
    return NextResponse.json({ ok: true, constancia, fecha: fecha.toISOString() });
  } catch (e) {
    if (e instanceof VotoError) {
      if (e.codigo === "TOKEN_NO_DISPONIBLE") await cerrarSesionVotante();
      return NextResponse.json({ error: e.message, codigo: e.codigo }, { status: ESTADO_HTTP[e.codigo] });
    }
    console.error("Error al emitir voto", e);
    return NextResponse.json({ error: "No se pudo registrar el voto. Inténtalo nuevamente." }, { status: 500 });
  }
}
