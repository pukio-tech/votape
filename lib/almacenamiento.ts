import "server-only";
import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

let cliente: S3Client | null = null;

function s3(): S3Client {
  if (!cliente) {
    if (!process.env.AWS_ENDPOINT_URL_S3 || !process.env.AWS_S3_BUCKET) {
      throw new Error("Falta configurar AWS_ENDPOINT_URL_S3 / AWS_S3_BUCKET.");
    }
    // Las credenciales se leen de AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY.
    cliente = new S3Client({
      region: process.env.AWS_REGION ?? "us-east-1",
      endpoint: process.env.AWS_ENDPOINT_URL_S3,
      forcePathStyle: true,
    });
  }
  return cliente;
}

const bucket = () => process.env.AWS_S3_BUCKET!;

/** Prefijo con el que se guardan las URLs en la BD; la app sirve las imágenes desde S3. */
export const PREFIJO_IMAGENES = "/api/imagenes/";

export const TIPOS_IMAGEN: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function subirImagen(clave: string, contenido: Uint8Array, tipo: string) {
  await s3().send(
    new PutObjectCommand({
      Bucket: bucket(),
      Key: clave,
      Body: contenido,
      ContentType: tipo,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return `${PREFIJO_IMAGENES}${clave}`;
}

export async function obtenerImagen(clave: string) {
  const r = await s3().send(new GetObjectCommand({ Bucket: bucket(), Key: clave }));
  return { cuerpo: r.Body, tipo: r.ContentType ?? "application/octet-stream", tamano: r.ContentLength };
}

/** Borra la imagen si la URL apunta a nuestro almacenamiento. No falla si no existe. */
export async function borrarImagenPorUrl(url: string | null | undefined) {
  if (!url?.startsWith(PREFIJO_IMAGENES)) return;
  try {
    await s3().send(new DeleteObjectCommand({ Bucket: bucket(), Key: url.slice(PREFIJO_IMAGENES.length) }));
  } catch (e) {
    console.error("No se pudo borrar la imagen", url, e);
  }
}
