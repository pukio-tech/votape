import { AlertCircle, CheckCircle2, Info, Vote } from "lucide-react";
import type { ReactNode } from "react";

/* ---------- Clases compartidas ---------- */

const baseBoton =
  "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60";

export const boton = {
  primario: `${baseBoton} bg-marca-600 px-5 py-3 text-sm text-white hover:bg-marca-700 focus-visible:ring-marca-200`,
  acento: `${baseBoton} bg-acento-400 px-5 py-3 text-sm text-marca-950 hover:bg-acento-300 focus-visible:ring-acento-200`,
  secundario: `${baseBoton} bg-white px-5 py-3 text-sm text-marca-900 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus-visible:ring-marca-100`,
  peligro: `${baseBoton} bg-red-600 px-5 py-3 text-sm text-white hover:bg-red-700 focus-visible:ring-red-200`,
  exito: `${baseBoton} bg-emerald-600 px-5 py-3 text-sm text-white hover:bg-emerald-700 focus-visible:ring-emerald-200`,
  fantasma: `${baseBoton} px-3 py-2 text-sm text-marca-700 hover:bg-marca-50 focus-visible:ring-marca-100`,
};

export const campo =
  "block w-full rounded-lg border-0 bg-white px-4 py-3 text-marca-950 ring-1 ring-inset ring-slate-300 outline-none transition placeholder:text-slate-400 hover:ring-slate-400 focus:ring-2 focus:ring-marca-600";

export const tarjeta = "rounded-xl bg-white shadow-sm ring-1 ring-slate-200";

/* ---------- Componentes ---------- */

export function Logo({ claro = false, compacto = false }: { claro?: boolean; compacto?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span
        className={`grid size-10 shrink-0 place-items-center rounded-xl ${
          claro ? "bg-white text-marca-700" : "bg-marca-700 text-white"
        }`}
      >
        <Vote className="size-5" strokeWidth={2.2} aria-hidden />
      </span>
      {!compacto && (
        <span className={`text-lg font-bold tracking-tight ${claro ? "text-white" : "text-marca-900"}`}>
          Vota<span className={claro ? "text-acento-300" : "text-marca-500"}>PE</span>
        </span>
      )}
    </span>
  );
}

export function Campo({
  etiqueta,
  htmlFor,
  icono,
  ayuda,
  children,
}: {
  etiqueta: string;
  htmlFor: string;
  icono?: ReactNode;
  ayuda?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-marca-900">
        {etiqueta}
      </label>
      <div className="relative">
        {icono && (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-slate-400 [&>svg]:size-[18px]">
            {icono}
          </span>
        )}
        {children}
      </div>
      {ayuda && <p className="mt-1.5 text-xs text-slate-500">{ayuda}</p>}
    </div>
  );
}

const estilosAlerta = {
  error: { caja: "bg-red-50 text-red-800 ring-red-200", Icono: AlertCircle },
  exito: { caja: "bg-emerald-50 text-emerald-800 ring-emerald-200", Icono: CheckCircle2 },
  info: { caja: "bg-marca-50 text-marca-800 ring-marca-200", Icono: Info },
  aviso: { caja: "bg-amber-50 text-amber-800 ring-amber-200", Icono: Info },
};

export function Alerta({ tipo, titulo, children }: { tipo: keyof typeof estilosAlerta; titulo?: string; children?: ReactNode }) {
  const { caja, Icono } = estilosAlerta[tipo];
  return (
    <div role={tipo === "error" ? "alert" : "status"} className={`flex gap-3 rounded-lg px-4 py-3 text-sm ring-1 ring-inset ${caja}`}>
      <Icono className="mt-0.5 size-[18px] shrink-0" aria-hidden />
      <div className="min-w-0">
        {titulo && <p className="font-semibold">{titulo}</p>}
        {children && <div className={titulo ? "mt-0.5" : ""}>{children}</div>}
      </div>
    </div>
  );
}

const estilosInsignia = {
  verde: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  ambar: "bg-amber-50 text-amber-700 ring-amber-600/25",
  rojo: "bg-red-50 text-red-700 ring-red-600/20",
  gris: "bg-slate-100 text-slate-700 ring-slate-500/20",
  marca: "bg-marca-50 text-marca-700 ring-marca-600/20",
};

export function Insignia({ color, children, punto = false }: { color: keyof typeof estilosInsignia; children: ReactNode; punto?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${estilosInsignia[color]}`}>
      {punto && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}
