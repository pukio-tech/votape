import type { ReactNode } from "react";

export function Encabezado({ titulo, subtitulo, accion }: { titulo: string; subtitulo?: string | null; accion?: ReactNode }) {
  return (
    <header className="bg-marca-800 text-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/20">
            <IconoUrna className="size-6" />
          </div>
          <div className="min-w-0">
            {subtitulo && <p className="truncate text-xs font-medium uppercase tracking-wider text-marca-200">{subtitulo}</p>}
            <h1 className="truncate text-base font-semibold sm:text-lg">{titulo}</h1>
          </div>
        </div>
        {accion}
      </div>
    </header>
  );
}

export function IconoUrna({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M4 13h16v7a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-7Z" />
      <path d="M8 13V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v9" />
      <path d="m10 8 1.5 1.5L14 7" />
      <path d="M2 13h20" />
    </svg>
  );
}
