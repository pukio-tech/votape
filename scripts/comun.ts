import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../lib/prisma";
import { generarToken, hashToken } from "../lib/tokens";

// ---------- CSV ----------

/** Lee un CSV (separado por "," o ";", como lo exporta Excel en español). */
export function leerCsv(ruta: string): Record<string, string>[] {
  const texto = readFileSync(ruta, "utf8").replace(/^﻿/, "");
  const lineas = texto.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lineas.length === 0) return [];
  const sep = (lineas[0].match(/;/g)?.length ?? 0) > (lineas[0].match(/,/g)?.length ?? 0) ? ";" : ",";

  const parsear = (linea: string) => {
    const celdas: string[] = [];
    let actual = "";
    let comillas = false;
    for (let i = 0; i < linea.length; i++) {
      const ch = linea[i];
      if (comillas) {
        if (ch === '"' && linea[i + 1] === '"') { actual += '"'; i++; }
        else if (ch === '"') comillas = false;
        else actual += ch;
      } else if (ch === '"') comillas = true;
      else if (ch === sep) { celdas.push(actual.trim()); actual = ""; }
      else actual += ch;
    }
    celdas.push(actual.trim());
    return celdas;
  };

  const cabecera = parsear(lineas[0]).map(normalizarCabecera);
  return lineas.slice(1).map((l) => {
    const celdas = parsear(l);
    return Object.fromEntries(cabecera.map((c, i) => [c, celdas[i] ?? ""]));
  });
}

function normalizarCabecera(c: string): string {
  return c.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, "");
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

export type FilaPadron = { codigoEstudiante: string; dni?: string; nombres: string; apellidos: string; correo?: string };

/**
 * Registra (o actualiza) votantes y genera tokens para quienes aún no tienen.
 * Con `regenerar`, también reemplaza los tokens PENDIENTES (nunca los USADOS).
 * Devuelve los tokens en claro: es la ÚNICA vez que se pueden obtener.
 */
export async function registrarPadron(filas: FilaPadron[], regenerar = false) {
  const salida: Record<string, string>[] = [];
  for (const fila of filas) {
    const votante = await prisma.votante.upsert({
      where: { codigoEstudiante: fila.codigoEstudiante },
      create: fila,
      update: { dni: fila.dni, nombres: fila.nombres, apellidos: fila.apellidos, correo: fila.correo },
      include: { token: true },
    });

    if (votante.token && !(regenerar && votante.token.estado === "PENDIENTE")) continue;

    const token = generarToken();
    await prisma.tokenAcceso.upsert({
      where: { votanteId: votante.id },
      create: { votanteId: votante.id, tokenHash: hashToken(token) },
      update: { tokenHash: hashToken(token), fechaGeneracion: new Date() },
    });
    salida.push({
      codigo: votante.codigoEstudiante,
      dni: votante.dni ?? "",
      apellidos: votante.apellidos,
      nombres: votante.nombres,
      correo: votante.correo ?? "",
      token,
    });
  }
  return salida;
}
