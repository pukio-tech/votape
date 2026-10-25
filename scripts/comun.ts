import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";
import { parsearCsv } from "../lib/padron";

// ---------- CSV ----------

/** Lee un CSV del disco (separado por "," o ";"). */
export function leerCsv(ruta: string): Record<string, string>[] {
  return parsearCsv(readFileSync(ruta, "utf8"));
}

export function escribirCsv(nombre: string, filas: Record<string, string>[]): string {
  const dir = path.join(process.cwd(), "salida");
  mkdirSync(dir, { recursive: true });
  const ruta = path.join(dir, nombre);
  const columnas = Object.keys(filas[0] ?? {});
  const esc = (v: string) => (/[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  const contenido = [columnas.join(","), ...filas.map((f) => columnas.map((c) => esc(f[c] ?? "")).join(","))].join("\n");
  // BOM para que Excel abra correctamente las tildes.
  writeFileSync(ruta, "﻿" + contenido, "utf8");
  return ruta;
}

// ---------- Elección ----------

export type DatosEleccion = {
  titulo: string;
  institucion?: string;
  fechaInicio: string;
  fechaCierre: string;
  cargos: {
    nombre: string;
    candidatos: { nombreCompleto: string; fotoUrl?: string; propuestaResumen?: string }[];
  }[];
};

/** Crea el proceso electoral con sus cargos y candidatos. */
export async function crearEleccion(datos: DatosEleccion, estado: "CONFIGURACION" | "EN_PROCESO" = "CONFIGURACION") {
  return prisma.procesoElectoral.create({
    data: {
      titulo: datos.titulo,
      institucion: datos.institucion,
      estado,
      fechaInicio: new Date(datos.fechaInicio),
      fechaCierre: new Date(datos.fechaCierre),
      cargos: {
        create: datos.cargos.map((cargo, orden) => ({
          nombre: cargo.nombre,
          orden,
          candidatos: { create: cargo.candidatos },
        })),
      },
    },
  });
}

// ---------- Padrón ----------

export { registrarPadron, validarPadron, type FilaPadron } from "../lib/padron";
