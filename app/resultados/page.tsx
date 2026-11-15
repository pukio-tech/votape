import { Vote } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Encabezado } from "@/components/Encabezado";
import { TableroResultados } from "@/components/resultados/TableroResultados";
import { Alerta } from "@/components/ui";
import { calcularResultados } from "@/lib/resultados";

export const metadata: Metadata = { title: "Resultados en vivo" };

export default async function ResultadosPublicos() {
  await connection();
  const resultados = await calcularResultados();

  return (
    <>
      <Encabezado
        titulo="Resultados en vivo"
        subtitulo={resultados?.proceso.institucion}
        accion={
          <Link
            href="/"
            className="flex items-center gap-2 rounded-xl bg-acento-400 px-3.5 py-2 text-sm font-semibold text-marca-950 transition hover:bg-acento-300"
          >
            <Vote className="size-4" aria-hidden /> <span className="hidden sm:inline">Ir a votar</span>
          </Link>
        }
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        {resultados ? (
          <>
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-acento-700">Conteo oficial en tiempo real</p>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-marca-950 sm:text-3xl">{resultados.proceso.titulo}</h2>
            </div>
            <TableroResultados inicial={resultados} />
            <p className="mt-6 text-center text-xs text-slate-500">
              Resultados de la votación electrónica. Se actualizan automáticamente cada 10 segundos.
            </p>
          </>
        ) : (
          <div className="mx-auto max-w-md">
            <Alerta tipo="info" titulo="Aún no hay resultados">
              El proceso electoral todavía no está configurado.
            </Alerta>
          </div>
        )}
      </main>
    </>
  );
}
