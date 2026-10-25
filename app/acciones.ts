"use server";

import { timingSafeEqual } from "node:crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { limitar, obtenerIp } from "@/lib/peticion";
import { prisma } from "@/lib/prisma";
import { estadoVotacion, obtenerProceso, registrarLog } from "@/lib/proceso";
import { cerrarSesionVotante, iniciarSesionVotante } from "@/lib/sesion";
import { hashToken } from "@/lib/tokens";

export type EstadoIngreso =
  | { tipo: "inicial" }
  | { tipo: "error"; mensaje: string; codigo?: string }
  | { tipo: "bloqueado"; motivo: "USADO" | "ANULADO"; fecha?: string };

const esquema = z.object({
  codigo: z.string().trim().min(1, "Ingresa tu código de estudiante.").max(30),
  token: z.string().trim().min(1, "Ingresa tu token de acceso.").max(40),
});

function hashIguales(a: string, b: string) {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function ingresar(_prev: EstadoIngreso, formData: FormData): Promise<EstadoIngreso> {
  const ip = await obtenerIp();
  if (!limitar(`ingreso:${ip}`, 10, 10 * 60 * 1000)) {
    return { tipo: "error", mensaje: "Demasiados intentos. Espera 10 minutos e inténtalo de nuevo." };
  }

  const datos = esquema.safeParse({ codigo: formData.get("codigo"), token: formData.get("token") });
  if (!datos.success) return { tipo: "error", mensaje: datos.error.issues[0].message };

  const proceso = await obtenerProceso();
  if (!estadoVotacion(proceso).abierta) {
    return { tipo: "error", mensaje: "La votación no está abierta en este momento.", codigo: datos.data.codigo };
  }

  const votante = await prisma.votante.findUnique({
    where: { codigoEstudiante: datos.data.codigo },
    include: { token: true },
  });

  // Mismo mensaje si el código o el token no existen: no revelamos cuál falló.
  if (!votante?.token || !hashIguales(votante.token.tokenHash, hashToken(datos.data.token))) {
    await registrarLog("TOKEN_INVALIDO", `Intento fallido con el código ${datos.data.codigo}.`, ip, proceso?.id);
    return {
      tipo: "error",
      mensaje: "El código o el token no son válidos. Revisa e inténtalo nuevamente.",
      codigo: datos.data.codigo,
    };
  }

  if (votante.token.estado === "USADO") {
    await registrarLog("INTENTO_REUSO", `El votante ${votante.codigoEstudiante} intentó votar otra vez.`, ip, proceso?.id);
    return { tipo: "bloqueado", motivo: "USADO", fecha: votante.token.fechaUso?.toISOString() };
  }
  if (votante.token.estado === "ANULADO") {
    return { tipo: "bloqueado", motivo: "ANULADO" };
  }

  await iniciarSesionVotante(votante.id);
  await registrarLog("INGRESO", `El votante ${votante.codigoEstudiante} abrió su cédula.`, ip, proceso?.id);
  redirect("/votar");
}

export async function salir() {
  await cerrarSesionVotante();
  redirect("/");
}
