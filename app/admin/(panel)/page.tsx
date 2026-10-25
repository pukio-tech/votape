import { ExternalLink, FileJson } from "lucide-react";
import Link from "next/link";
import { TableroResultados } from "@/components/resultados/TableroResultados";
import { boton, tarjeta } from "@/components/ui";
import { calcularResultados } from "@/lib/resultados";

export default async function Tablero() {
  const resultados = await calcularResultados();

  if (!resultados) {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-16">
        <div className={`${tarjeta} p-8 text-center`}>
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-marca-50 text-marca-600">
            <FileJson className="size-7" aria-hidden />
          </div>
          <h2 className="mt-4 text-lg font-bold text-marca-950">Configura el proceso electoral</h2>
          <p className="mt-2 text-sm text-slate-600">Crea el proceso y registra los cargos y candidatos.</p>
          <Link href="/admin/candidatos" className={`${boton.primario} mt-5`}>
            Ir a candidatos
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-acento-600">{resultados.proceso.institucion}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-marca-950">{resultados.proceso.titulo}</h2>
        </div>
        <Link
          href="/resultados"
          target="_blank"
          className="flex items-center gap-1.5 text-sm font-semibold text-marca-600 hover:text-marca-800"
        >
          Ver página pública <ExternalLink className="size-4" aria-hidden />
        </Link>
      </div>
      <TableroResultados inicial={resultados} intervaloMs={5000} />
    </main>
  );
}
