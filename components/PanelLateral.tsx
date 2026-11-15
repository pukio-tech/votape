"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Panel que se desliza desde la derecha (slide-over). En celular ocupa toda la pantalla.
 * El cuerpo hace scroll y el pie con los botones queda siempre visible.
 */
export function PanelLateral({
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
  const panel = useRef<HTMLDivElement>(null);
  const cerrar = useRef(onCerrar);
  useEffect(() => {
    cerrar.current = onCerrar;
  });

  useEffect(() => {
    const alPresionar = (e: KeyboardEvent) => e.key === "Escape" && cerrar.current?.();
    window.addEventListener("keydown", alPresionar);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Lleva el foco al primer campo (o al panel) para teclado y lectores de pantalla.
    const primero = panel.current?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea");
    (primero ?? panel.current)?.focus({ preventScroll: true });
    return () => {
      window.removeEventListener("keydown", alPresionar);
      document.body.style.overflow = overflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal aria-labelledby="titulo-panel">
      <div className="absolute inset-0 animate-[aparecer_0.2s_ease-out_both] bg-marca-950/50" onClick={() => onCerrar?.()} aria-hidden />
      <div
        ref={panel}
        tabIndex={-1}
        className="relative flex h-dvh w-full animate-deslizar flex-col bg-white shadow-2xl outline-none sm:max-w-lg"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 bg-marca-800 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] text-white sm:px-6">
          <div className="min-w-0">
            <h2 id="titulo-panel" className="text-lg font-bold">
              {titulo}
            </h2>
            {descripcion && <p className="mt-0.5 text-sm text-marca-100">{descripcion}</p>}
          </div>
          {onCerrar && (
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="-mr-2 grid size-10 shrink-0 place-items-center rounded-lg text-marca-100 transition hover:bg-white/10 hover:text-white"
            >
              <X className="size-5" />
            </button>
          )}
        </header>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6">{children}</div>
        {pie && (
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:px-6 [&>*]:w-full sm:[&>*]:w-auto">
            {pie}
          </div>
        )}
      </div>
    </div>
  );
}

/** Pie fijo para los botones de un <form> que va dentro del cuerpo del panel. */
export const piePanel =
  "sticky bottom-0 z-10 -mx-5 -mb-5 mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 bg-white px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:-mx-6 sm:flex-row sm:justify-end sm:px-6 [&>*]:w-full sm:[&>*]:w-auto";
