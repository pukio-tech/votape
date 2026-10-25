import { NextResponse } from "next/server";
import { calcularResultados } from "@/lib/resultados";
import { esAdmin } from "@/lib/sesion";

export async function GET() {
  if (!(await esAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const resultados = await calcularResultados();
  return NextResponse.json(resultados, { headers: { "Cache-Control": "no-store" } });
}
