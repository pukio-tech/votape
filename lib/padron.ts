import { prisma } from "./prisma";
import { generarToken, hashToken } from "./tokens";

// Compartido por el panel (/admin/votantes) y los scripts de línea de comandos.

/** Interpreta un CSV separado por "," o ";" (como lo exporta Excel en español). */
export function parsearCsv(texto: string): Record<string, string>[] {
  const lineas = texto
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .filter((l) => l.trim() !== "");
  if (lineas.length === 0) return [];
  const sep = (lineas[0].match(/;/g)?.length ?? 0) > (lineas[0].match(/,/g)?.length ?? 0) ? ";" : ",";

  const parsear = (linea: string) => {
    const celdas: string[] = [];
    let actual = "";
    let comillas = false;
    for (let i = 0; i < linea.length; i++) {
      const ch = linea[i];
      if (comillas) {
        if (ch === '"' && linea[i + 1] === '"') {
          actual += '"';
          i++;
        } else if (ch === '"') comillas = false;
        else actual += ch;
      } else if (ch === '"') comillas = true;
      else if (ch === sep) {
        celdas.push(actual.trim());
        actual = "";
      } else actual += ch;
    }
    celdas.push(actual.trim());
    return celdas;
  };

  const cabecera = parsear(lineas[0]).map((c) =>
    c.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z]/g, ""),
  );
  return lineas.slice(1).map((l) => {
    const celdas = parsear(l);
    return Object.fromEntries(cabecera.map((c, i) => [c, celdas[i] ?? ""]));
  });
}

export type FilaPadron = { codigoEstudiante: string; dni?: string; nombres: string; apellidos: string; correo?: string };

/** Convierte las filas del CSV en votantes y reporta los errores por fila. */
export function validarPadron(filas: Record<string, string>[]) {
  const errores: string[] = [];
  const padron = filas.flatMap((f, i) => {
    const codigo = f.codigo || f.codigoestudiante || f.codigouniversitario;
    if (!codigo || !f.nombres || !f.apellidos) {
      errores.push(`Fila ${i + 2}: falta código, nombres o apellidos.`);
      return [];
    }
    return [
      {
        codigoEstudiante: codigo.slice(0, 30),
        dni: f.dni || undefined,
        nombres: f.nombres.slice(0, 80),
        apellidos: f.apellidos.slice(0, 80),
        correo: f.correo || undefined,
      },
    ];
  });
  const repetidos = padron.map((p) => p.codigoEstudiante).filter((c, i, a) => a.indexOf(c) !== i);
  if (repetidos.length) errores.push(`Códigos repetidos en el archivo: ${[...new Set(repetidos)].join(", ")}`);
  return { padron, errores };
}

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
