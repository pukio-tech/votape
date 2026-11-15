// Plantilla del mensaje de WhatsApp con el acceso del votante. Compartido por el servidor
// (arma el mensaje real) y el editor del panel (vista previa).

export const VARIABLES_PLANTILLA = [
  { clave: "nombre", descripcion: "Nombre completo" },
  { clave: "nombres", descripcion: "Solo nombres" },
  { clave: "codigo", descripcion: "Código del votante" },
  { clave: "token", descripcion: "Token de acceso" },
  { clave: "enlace", descripcion: "Dirección para votar" },
  { clave: "eleccion", descripcion: "Título de la elección" },
] as const;

export type DatosPlantilla = Record<(typeof VARIABLES_PLANTILLA)[number]["clave"], string>;

export const PLANTILLA_POR_DEFECTO = [
  "Hola {nombre}, este es tu acceso para votar en *{eleccion}*:",
  "",
  "Código: *{codigo}*",
  "Token: *{token}*",
  "",
  "Ingresa aquí: {enlace}",
  "",
  "Tu voto es secreto. No compartas tu token: solo sirve para votar una vez.",
].join("\n");

export const EJEMPLO_PLANTILLA: DatosPlantilla = {
  nombre: "Rosa Elena Huamán Pérez",
  nombres: "Rosa Elena",
  codigo: "62180199",
  token: "ABCDE-FGHJK",
  enlace: "https://votape.vercel.app",
  eleccion: "Elección de Junta Directiva",
};

/** Reemplaza {variable} por su valor. Las variables desconocidas se dejan tal cual. */
export function aplicarPlantilla(plantilla: string, datos: DatosPlantilla): string {
  return plantilla.replace(/\{(\w+)\}/g, (original, clave: string) => (clave in datos ? datos[clave as keyof DatosPlantilla] : original));
}
