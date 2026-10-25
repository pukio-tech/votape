"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";

/** Diálogo centrado en escritorio y hoja inferior en celular. */
export function Modal({
  titulo,
  descripcion,
  onCerrar,
  children,
  pie,
}: {
  titulo: string;
  descripcion?: string;
  onCerrar?: () => void;
  children: ReactNode;
  pie?: ReactNode;
}) {
  useEffect(() => {
    if (!onCerrar) return;
    const alPresionar = (e: KeyboardEvent) => e.key === "Escape" && onCerrar();
    window.addEventListener("keydown", alPresionar);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", alPresionar);
      document.body.style.overflow = overflow;
    };
  }, [onCerrar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-marca-950/60 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal
      aria-labelledby="titulo-modal"
      onClick={(e) => e.target === e.currentTarget && onCerrar?.()}
    >
      <div className="flex max-h-[92dvh] w-full animate-subir flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:animate-aparecer sm:rounded-3xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 pb-4 pt-5">
          <div>
            <h2 id="titulo-modal" className="text-lg font-bold text-marca-950">
              {titulo}
            </h2>
            {descripcion && <p className="mt-0.5 text-sm text-slate-500">{descripcion}</p>}
          </div>
          {onCerrar && (
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="-mr-2 grid size-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="size-5" />
            </button>
          )}
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {pie && <div className="flex flex-col-reverse gap-3 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">{pie}</div>}
      </div>
    </div>
  );
}
