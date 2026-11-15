/** Deja solo los dígitos. Un número peruano con prefijo 51 se guarda con sus 9 dígitos. */
export function normalizarCelular(valor: string | null | undefined): string | null {
  const digitos = (valor ?? "").replace(/\D/g, "");
  if (!digitos) return null;
  return digitos.length === 11 && digitos.startsWith("51") ? digitos.slice(2) : digitos;
}

/** Número válido: 9 dígitos (Perú) o internacional de 10 a 15 dígitos. */
export function celularValido(celular: string): boolean {
  return /^9\d{8}$/.test(celular) || /^\d{10,15}$/.test(celular);
}

/** Enlace de WhatsApp con el mensaje ya escrito (a los números de 9 dígitos se les antepone 51). */
export function enlaceWhatsapp(celular: string, mensaje: string): string {
  const numero = celular.length === 9 ? `51${celular}` : celular;
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
