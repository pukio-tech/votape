import "server-only";
import { cache } from "react";
import { PLANTILLA_POR_DEFECTO } from "./plantilla";
import { prisma } from "./prisma";

export const NOMBRE_POR_DEFECTO = "VotaPE";

/** Ajustes de la plataforma, leídos una sola vez por petición. */
export const obtenerAjustes = cache(async () => {
  try {
    const ajustes = await prisma.ajustes.findUnique({ where: { id: "general" } });
    return {
      nombrePlataforma: ajustes?.nombrePlataforma ?? NOMBRE_POR_DEFECTO,
      plantillaWhatsapp: ajustes?.plantillaWhatsapp ?? PLANTILLA_POR_DEFECTO,
    };
  } catch {
    // Si la BD no está disponible (p. ej. al compilar), se usan los valores por defecto.
    return { nombrePlataforma: NOMBRE_POR_DEFECTO, plantillaWhatsapp: PLANTILLA_POR_DEFECTO };
  }
});
