import type { ReactNode } from "react";
import { obtenerAjustes } from "@/lib/ajustes";
import { Logo } from "./ui";

export async function Encabezado({ titulo, subtitulo, accion }: { titulo: string; subtitulo?: string | null; accion?: ReactNode }) {
  const { nombrePlataforma } = await obtenerAjustes();
  return (
    <header className="sticky top-0 z-30 bg-marca-800 text-white shadow-sm shadow-marca-950/20">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Logo nombre={nombrePlataforma} claro compacto />
          <div className="min-w-0">
            {subtitulo && <p className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-acento-300">{subtitulo}</p>}
            <h1 className="truncate text-sm font-semibold sm:text-base">{titulo}</h1>
          </div>
        </div>
        {accion}
      </div>
    </header>
  );
}
