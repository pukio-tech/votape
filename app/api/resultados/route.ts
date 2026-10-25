import { NextResponse } from "next/server";
import { calcularResultados } from "@/lib/resultados";

// Público: solo conteos agregados, sin datos de votantes.
export async function GET() {
  const resultados = await calcularResultados();
  if (!resultados) return NextResponse.json({ error: "No hay proceso electoral." }, { status: 404 });
  return NextResponse.json(resultados, { headers: { "Cache-Control": "no-store" } });
}
