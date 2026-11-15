"use client";

import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { useRef, useState } from "react";

const LADO_MAXIMO = 800;

/** Reduce la imagen en el navegador (máx. 800 px) para subir archivos livianos. PNG conserva la transparencia. */
async function reducir(archivo: File, tipo: "image/jpeg" | "image/png"): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo);
  const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
  const lienzo = document.createElement("canvas");
  lienzo.width = Math.round(bitmap.width * escala);
  lienzo.height = Math.round(bitmap.height * escala);
  lienzo.getContext("2d")!.drawImage(bitmap, 0, 0, lienzo.width, lienzo.height);
  return new Promise((resolve, reject) =>
    lienzo.toBlob((b) => (b ? resolve(b) : reject(new Error("No se pudo procesar la imagen."))), tipo, 0.85),
  );
}

/**
 * Selector de imagen que la sube a S3 y deja la URL en un input oculto `name`.
 * `logo`: guarda en PNG (con transparencia) en la carpeta de marca y la muestra sin recortar.
 */
export function SubirFoto({ name, inicial, logo = false }: { name: string; inicial?: string | null; logo?: boolean }) {
  const [url, setUrl] = useState(inicial ?? "");
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function alElegir(archivo: File | undefined) {
    if (!archivo) return;
    setError("");
    if (!archivo.type.startsWith("image/")) return setError("Elige una imagen JPG, PNG o WEBP.");
    setSubiendo(true);
    try {
      const datos = new FormData();
      datos.append("archivo", await reducir(archivo, logo ? "image/png" : "image/jpeg"), logo ? "logo.png" : "foto.jpg");
      datos.append("carpeta", logo ? "marca" : "candidatos");
      const res = await fetch("/api/admin/imagenes", { method: "POST", body: datos });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "No se pudo subir la imagen.");
      setUrl(json.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo subir la imagen.");
    } finally {
      setSubiendo(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <input type="hidden" name={name} value={url} />
      <div className="flex items-center gap-4">
        <div
          className={`grid shrink-0 place-items-center overflow-hidden rounded-lg ring-1 ring-slate-200 ${logo ? "h-24 w-40 bg-white p-2" : "size-24 bg-slate-100"}`}
        >
          {subiendo ? (
            <Loader2 className="size-6 animate-spin text-marca-500" aria-label="Subiendo" />
          ) : url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={logo ? "Logo" : "Foto del candidato"} className={`size-full ${logo ? "object-contain" : "object-cover"}`} />
          ) : (
            <ImageUp className="size-7 text-slate-400" aria-hidden />
          )}
        </div>
        <div className="flex flex-col items-start gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-semibold text-marca-800 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
            <ImageUp className="size-4" aria-hidden />
            {url ? (logo ? "Cambiar logo" : "Cambiar foto") : logo ? "Subir logo" : "Subir foto"}
            <input
              ref={input}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={subiendo}
              onChange={(e) => alElegir(e.target.files?.[0])}
            />
          </label>
          {url && !subiendo && (
            <button type="button" onClick={() => setUrl("")} className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 hover:text-red-700">
              <Trash2 className="size-3.5" aria-hidden /> {logo ? "Quitar logo" : "Quitar foto"}
            </button>
          )}
        </div>
      </div>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
