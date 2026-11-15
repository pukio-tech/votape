import type { ReactNode } from "react";
import { obtenerAjustes } from "@/lib/ajustes";
import { Logo } from "./ui";

/** Ingreso simple: franja azul con el título y una tarjeta centrada con el formulario. */
export async function PantallaAcceso({
  subtitulo,
  titulo,
  estado,
  children,
}: {
  subtitulo?: string | null;
  titulo: string;
  estado?: ReactNode;
  children: ReactNode;
}) {
  const { nombrePlataforma, logoUrl } = await obtenerAjustes();
  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="bg-marca-800 px-4 pb-24 pt-6 text-white sm:pb-28">
        <div className="mx-auto max-w-md">
          <div className={logoUrl ? "flex justify-center" : ""}>
            <Logo nombre={nombrePlataforma} logoUrl={logoUrl} claro grande />
          </div>
          <div className={`${logoUrl ? "mt-5" : "mt-8"} text-center`}>
            {subtitulo && <p className="text-xs font-semibold uppercase tracking-[0.16em] text-acento-300">{subtitulo}</p>}
            <h1 className="mt-1.5 text-2xl font-bold leading-tight text-balance sm:text-3xl">{titulo}</h1>
            {estado && <div className="mt-4">{estado}</div>}
          </div>
        </div>
      </header>
      <main className="-mt-16 flex flex-1 justify-center px-4 pb-10 sm:-mt-20">
        <div className="h-fit w-full max-w-md animate-aparecer rounded-xl bg-white p-6 shadow-lg shadow-marca-950/10 ring-1 ring-slate-200 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
