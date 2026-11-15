import { NextResponse, type NextRequest } from "next/server";
import { obtenerImagen } from "@/lib/almacenamiento";

// Sirve las imágenes guardadas en S3: fotos de candidatos y logo de la plataforma (son públicas).
export async function GET(_request: NextRequest, { params }: { params: Promise<{ clave: string[] }> }) {
  const clave = (await params).clave.join("/");
  if (!/^(candidatos|marca)\/[a-zA-Z0-9-]+\.(jpg|png|webp)$/.test(clave)) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  try {
    const { cuerpo, tipo, tamano } = await obtenerImagen(clave);
    if (!cuerpo) throw new Error("vacío");
    return new Response(cuerpo.transformToWebStream(), {
      headers: {
        "Content-Type": tipo,
        ...(tamano ? { "Content-Length": String(tamano) } : {}),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
}
