import { NextResponse, type NextRequest } from "next/server";
import { obtenerImagen } from "@/lib/almacenamiento";
import { obtenerAdmin, obtenerVotanteSesion } from "@/lib/sesion";

/**
 * Sirve las imágenes guardadas en S3. Las fotos de candidatos y el logo son públicos; las fotos
 * de votantes son datos personales y solo se entregan con sesión del comité o de un votante.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ clave: string[] }> }) {
  const clave = (await params).clave.join("/");
  if (!/^(candidatos|marca|votantes)\/[a-zA-Z0-9-]+\.(jpg|png|webp)$/.test(clave)) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  const privada = clave.startsWith("votantes/");
  if (privada && !(await obtenerAdmin()) && !(await obtenerVotanteSesion())) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  try {
    const { cuerpo, tipo, tamano } = await obtenerImagen(clave);
    if (!cuerpo) throw new Error("vacío");
    return new Response(cuerpo.transformToWebStream(), {
      headers: {
        "Content-Type": tipo,
        ...(tamano ? { "Content-Length": String(tamano) } : {}),
        "Cache-Control": privada ? "private, max-age=3600" : "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
}
