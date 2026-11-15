import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { subirImagen, TIPOS_IMAGEN } from "@/lib/almacenamiento";
import { obtenerAdmin } from "@/lib/sesion";

const TAMANO_MAXIMO = 5 * 1024 * 1024;

/** Sube una foto de candidato o el logo de la plataforma a S3. Solo administradores. */
export async function POST(request: NextRequest) {
  const origen = request.headers.get("origin");
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (origen && new URL(origen).host !== host) {
    return NextResponse.json({ error: "Origen no permitido." }, { status: 403 });
  }
  if ((await obtenerAdmin())?.rol !== "ADMIN") {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const formulario = await request.formData().catch(() => null);
  const archivo = formulario?.get("archivo");
  const pedida = formulario?.get("carpeta");
  const carpeta = pedida === "marca" || pedida === "votantes" ? pedida : "candidatos";
  if (!(archivo instanceof File)) return NextResponse.json({ error: "Adjunta una imagen." }, { status: 400 });
  const extension = TIPOS_IMAGEN[archivo.type];
  if (!extension) return NextResponse.json({ error: "Usa una imagen JPG, PNG o WEBP." }, { status: 400 });
  if (archivo.size > TAMANO_MAXIMO) return NextResponse.json({ error: "La imagen supera los 5 MB." }, { status: 400 });

  try {
    const url = await subirImagen(`${carpeta}/${randomUUID()}.${extension}`, new Uint8Array(await archivo.arrayBuffer()), archivo.type);
    return NextResponse.json({ url });
  } catch (e) {
    console.error("Error al subir imagen", e);
    return NextResponse.json({ error: "No se pudo subir la imagen. Inténtalo de nuevo." }, { status: 502 });
  }
}
