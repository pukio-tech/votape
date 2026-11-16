"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Respuesta } from "@/app/admin/acciones";
import { borrarImagenPorUrl, PREFIJO_IMAGENES } from "@/lib/almacenamiento";
import { exigirAdmin } from "@/lib/autorizacion";
import { desdeInputLocal } from "@/lib/fechas";
import { obtenerIp } from "@/lib/peticion";
import { prisma } from "@/lib/prisma";
import { calcularResultados } from "@/lib/resultados";
import { obtenerProceso, registrarLog } from "@/lib/proceso";

const RUTAS = ["/admin/candidatos", "/admin/jornada", "/admin", "/"];
const refrescar = () => RUTAS.forEach((r) => revalidatePath(r));

const AVISO_CON_VOTOS =
  "Ya hay votos registrados: no se pueden agregar ni eliminar cargos o candidatos. Solo puedes editar nombres, fotos y propuestas.";

async function hayVotos(procesoId: string) {
  return (await prisma.voto.count({ where: { procesoId } })) > 0;
}

async function procesoActual() {
  const proceso = await obtenerProceso();
  if (!proceso) throw new Error("Primero crea el proceso electoral.");
  return proceso;
}

// ---------- Proceso electoral ----------

const fechaLocal = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Fecha inválida.");

export async function guardarProceso(_prev: Respuesta, formData: FormData): Promise<Respuesta> {
  const admin = await exigirAdmin();
  const base = z.object({
    titulo: z.string().trim().min(3, "Ingresa el título de la elección.").max(150),
    institucion: z.string().trim().max(150),
  });
  const datos = base.safeParse({ titulo: formData.get("titulo"), institucion: formData.get("institucion") ?? "" });
  if (!datos.success) return { ok: false, mensaje: datos.error.issues[0].message };

  const proceso = await obtenerProceso();
  if (proceso) {
    await prisma.procesoElectoral.update({
      where: { id: proceso.id },
      data: { titulo: datos.data.titulo, institucion: datos.data.institucion || null },
    });
    await registrarLog("PROCESO_EDITADO", `${admin.nombre} actualizó los datos del proceso.`, await obtenerIp(), proceso.id);
    refrescar();
    return { ok: true, mensaje: "Datos del proceso actualizados." };
  }

  const fechas = z.object({ inicio: fechaLocal, cierre: fechaLocal }).safeParse({
    inicio: formData.get("inicio"),
    cierre: formData.get("cierre"),
  });
  if (!fechas.success) return { ok: false, mensaje: "Indica la fecha y hora de apertura y de cierre." };
  const fechaInicio = desdeInputLocal(fechas.data.inicio);
  const fechaCierre = desdeInputLocal(fechas.data.cierre);
  if (fechaCierre <= fechaInicio) return { ok: false, mensaje: "El cierre debe ser posterior a la apertura." };

  const creado = await prisma.procesoElectoral.create({
    data: { titulo: datos.data.titulo, institucion: datos.data.institucion || null, fechaInicio, fechaCierre },
  });
  await registrarLog("PROCESO_CREADO", `${admin.nombre} creó el proceso "${creado.titulo}".`, await obtenerIp(), creado.id);
  refrescar();
  return { ok: true, mensaje: "Proceso electoral creado. Ahora registra los cargos y candidatos." };
}

// ---------- Cargos ----------

const nombreCargo = z.string().trim().min(2, "Ingresa el nombre del cargo.").max(100);

export async function guardarCargo(_prev: Respuesta, formData: FormData): Promise<Respuesta> {
  const admin = await exigirAdmin();
  const proceso = await procesoActual();
  const nombre = nombreCargo.safeParse(formData.get("nombre"));
  if (!nombre.success) return { ok: false, mensaje: nombre.error.issues[0].message };
  const max = z.coerce
    .number()
    .int("Indica un número entero.")
    .min(1, "Se elige al menos 1 persona.")
    .max(10, "Máximo 10 personas por cargo.")
    .safeParse(formData.get("maxSelecciones") ?? 1);
  if (!max.success) return { ok: false, mensaje: max.error.issues[0].message };
  const maxSelecciones = max.data;
  const id = String(formData.get("id") ?? "");

  if (id) {
    const cargo = await prisma.cargo.findFirst({ where: { id, procesoId: proceso.id } });
    if (!cargo) return { ok: false, mensaje: "El cargo no existe." };
    // Con votos emitidos no se puede cambiar cuántos se eligen (cambiaría las reglas a mitad de la votación).
    if (cargo.maxSelecciones !== maxSelecciones && (await hayVotos(proceso.id))) return { ok: false, mensaje: AVISO_CON_VOTOS };
    await prisma.cargo.update({ where: { id }, data: { nombre: nombre.data, maxSelecciones } });
    await registrarLog(
      "CARGO_EDITADO",
      `${admin.nombre} editó el cargo "${nombre.data}" (se eligen ${maxSelecciones}).`,
      await obtenerIp(),
      proceso.id,
    );
  } else {
    if (await hayVotos(proceso.id)) return { ok: false, mensaje: AVISO_CON_VOTOS };
    const ultimo = await prisma.cargo.aggregate({ where: { procesoId: proceso.id }, _max: { orden: true } });
    await prisma.cargo.create({
      data: { procesoId: proceso.id, nombre: nombre.data, maxSelecciones, orden: (ultimo._max.orden ?? -1) + 1 },
    });
    await registrarLog("CARGO_CREADO", `${admin.nombre} creó el cargo "${nombre.data}" (se eligen ${maxSelecciones}).`, await obtenerIp(), proceso.id);
  }
  refrescar();
  return { ok: true, mensaje: id ? "Cargo actualizado." : `Cargo "${nombre.data}" creado.` };
}

export async function moverCargo(id: string, direccion: -1 | 1): Promise<Respuesta> {
  await exigirAdmin();
  const proceso = await procesoActual();
  const cargos = await prisma.cargo.findMany({ where: { procesoId: proceso.id }, orderBy: { orden: "asc" } });
  const i = cargos.findIndex((c) => c.id === id);
  const j = i + direccion;
  if (i < 0 || j < 0 || j >= cargos.length) return null;
  [cargos[i], cargos[j]] = [cargos[j], cargos[i]];
  await prisma.$transaction(cargos.map((c, orden) => prisma.cargo.update({ where: { id: c.id }, data: { orden } })));
  refrescar();
  return { ok: true, mensaje: "Orden actualizado." };
}

export async function eliminarCargo(id: string): Promise<Respuesta> {
  const admin = await exigirAdmin();
  const proceso = await procesoActual();
  if (await hayVotos(proceso.id)) return { ok: false, mensaje: AVISO_CON_VOTOS };
  const cargo = await prisma.cargo.findFirst({ where: { id, procesoId: proceso.id }, include: { candidatos: true } });
  if (!cargo) return { ok: false, mensaje: "El cargo no existe." };

  await prisma.cargo.delete({ where: { id } });
  await Promise.all(cargo.candidatos.map((c) => borrarImagenPorUrl(c.fotoUrl)));
  await registrarLog("CARGO_ELIMINADO", `${admin.nombre} eliminó el cargo "${cargo.nombre}".`, await obtenerIp(), proceso.id);
  refrescar();
  return { ok: true, mensaje: `Cargo "${cargo.nombre}" eliminado.` };
}

// ---------- Candidatos ----------

const esquemaCandidato = z.object({
  cargoId: z.string().min(1, "Elige el cargo."),
  nombreCompleto: z.string().trim().min(3, "Ingresa el nombre completo.").max(120),
  propuestaResumen: z.string().trim().max(400, "La propuesta admite hasta 400 caracteres."),
  fotoUrl: z
    .string()
    .refine(
      (u) => u === "" || u.startsWith(`${PREFIJO_IMAGENES}candidatos/`) || /^\/candidatos\/[\w.-]+$/.test(u),
      "Foto no válida.",
    ),
});

export async function guardarCandidato(_prev: Respuesta, formData: FormData): Promise<Respuesta> {
  const admin = await exigirAdmin();
  const proceso = await procesoActual();
  const datos = esquemaCandidato.safeParse({
    cargoId: formData.get("cargoId"),
    nombreCompleto: formData.get("nombreCompleto"),
    propuestaResumen: formData.get("propuestaResumen") ?? "",
    fotoUrl: formData.get("fotoUrl") ?? "",
  });
  if (!datos.success) return { ok: false, mensaje: datos.error.issues[0].message };
  const { cargoId, nombreCompleto, propuestaResumen, fotoUrl } = datos.data;

  const cargo = await prisma.cargo.findFirst({ where: { id: cargoId, procesoId: proceso.id } });
  if (!cargo) return { ok: false, mensaje: "El cargo no existe." };

  const id = String(formData.get("id") ?? "");
  const data = { cargoId, nombreCompleto, propuestaResumen: propuestaResumen || null, fotoUrl: fotoUrl || null };

  if (id) {
    const actual = await prisma.candidato.findFirst({ where: { id, cargo: { procesoId: proceso.id } } });
    if (!actual) return { ok: false, mensaje: "El candidato no existe." };
    // Con votos emitidos no se puede mover al candidato a otro cargo (alteraría el conteo).
    if (actual.cargoId !== cargoId && (await hayVotos(proceso.id))) return { ok: false, mensaje: AVISO_CON_VOTOS };
    await prisma.candidato.update({ where: { id }, data });
    if (actual.fotoUrl !== data.fotoUrl) await borrarImagenPorUrl(actual.fotoUrl);
    await registrarLog("CANDIDATO_EDITADO", `${admin.nombre} editó a ${nombreCompleto} (${cargo.nombre}).`, await obtenerIp(), proceso.id);
  } else {
    if (await hayVotos(proceso.id)) return { ok: false, mensaje: AVISO_CON_VOTOS };
    await prisma.candidato.create({ data });
    await registrarLog("CANDIDATO_CREADO", `${admin.nombre} registró a ${nombreCompleto} para ${cargo.nombre}.`, await obtenerIp(), proceso.id);
  }
  refrescar();
  return { ok: true, mensaje: id ? "Candidato actualizado." : `${nombreCompleto} registrado en ${cargo.nombre}.` };
}

export async function eliminarCandidato(id: string): Promise<Respuesta> {
  const admin = await exigirAdmin();
  const proceso = await procesoActual();
  if (await hayVotos(proceso.id)) return { ok: false, mensaje: AVISO_CON_VOTOS };
  const candidato = await prisma.candidato.findFirst({ where: { id, cargo: { procesoId: proceso.id } }, include: { cargo: true } });
  if (!candidato) return { ok: false, mensaje: "El candidato no existe." };

  await prisma.candidato.delete({ where: { id } });
  await borrarImagenPorUrl(candidato.fotoUrl);
  await registrarLog(
    "CANDIDATO_ELIMINADO",
    `${admin.nombre} eliminó a ${candidato.nombreCompleto} (${candidato.cargo.nombre}).`,
    await obtenerIp(),
    proceso.id,
  );
  refrescar();
  return { ok: true, mensaje: `${candidato.nombreCompleto} eliminado.` };
}

// ---------- Ajustes de la plataforma ----------

export async function guardarNombrePlataforma(_prev: Respuesta, formData: FormData): Promise<Respuesta> {
  const admin = await exigirAdmin();
  const nombre = z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres.").max(40, "Máximo 40 caracteres.").safeParse(formData.get("nombre"));
  if (!nombre.success) return { ok: false, mensaje: nombre.error.issues[0].message };

  await prisma.ajustes.upsert({
    where: { id: "general" },
    create: { id: "general", nombrePlataforma: nombre.data },
    update: { nombrePlataforma: nombre.data },
  });
  await registrarLog("AJUSTES_EDITADOS", `${admin.nombre} cambió el nombre de la plataforma a "${nombre.data}".`, await obtenerIp());
  revalidatePath("/", "layout");
  return { ok: true, mensaje: `La plataforma ahora se llama "${nombre.data}".` };
}

export async function guardarLogo(_prev: Respuesta, formData: FormData): Promise<Respuesta> {
  const admin = await exigirAdmin();
  const url = String(formData.get("logoUrl") ?? "");
  if (url && !url.startsWith(`${PREFIJO_IMAGENES}marca/`)) return { ok: false, mensaje: "Logo no válido. Súbelo de nuevo." };

  const actual = await prisma.ajustes.findUnique({ where: { id: "general" } });
  const logoUrl = url || null;
  await prisma.ajustes.upsert({ where: { id: "general" }, create: { id: "general", logoUrl }, update: { logoUrl } });
  if (actual?.logoUrl && actual.logoUrl !== logoUrl) await borrarImagenPorUrl(actual.logoUrl);
  await registrarLog("AJUSTES_EDITADOS", `${admin.nombre} ${logoUrl ? "cambió" : "quitó"} el logo de la plataforma.`, await obtenerIp());
  revalidatePath("/", "layout");
  return { ok: true, mensaje: logoUrl ? "Logo actualizado." : "Se quitó el logo; se usa el ícono por defecto." };
}

// ---------- Desempates ----------

/**
 * El comité decide un empate que no se resolvió solo (ni por votos ni por preferencias).
 * Solo con la votación cerrada y solo entre los candidatos realmente empatados en ese puesto.
 */
export async function resolverEmpate(cargoId: string, puesto: number, candidatoId: string): Promise<Respuesta> {
  const admin = await exigirAdmin();
  const resultados = await calcularResultados();
  if (!resultados?.publicados) return { ok: false, mensaje: "Los empates se resuelven cuando la votación ya cerró." };

  const cargo = resultados.cargos.find((c) => c.id === cargoId);
  if (!cargo) return { ok: false, mensaje: "El cargo no existe." };
  const ronda = cargo.rondas ? cargo.rondas.find((r) => r.puesto === puesto) : puesto === 1 ? cargo : undefined;
  if (!ronda || !ronda.empatados.includes(candidatoId) || ronda.criterio === "votos" || ronda.criterio === "preferencias") {
    return { ok: false, mensaje: "Ese puesto no tiene un empate pendiente con ese candidato." };
  }

  const candidato = cargo.candidatos.find((c) => c.id === candidatoId);
  await prisma.$transaction([
    prisma.desempate.upsert({
      where: { cargoId_puesto: { cargoId, puesto } },
      create: { cargoId, puesto, candidatoId, decididoPor: admin.nombre },
      update: { candidatoId, decididoPor: admin.nombre },
    }),
    // Cambiar un puesto cambia las rondas siguientes: sus decisiones previas ya no aplican.
    prisma.desempate.deleteMany({ where: { cargoId, puesto: { gt: puesto } } }),
  ]);
  await registrarLog(
    "EMPATE_RESUELTO",
    `${admin.nombre} resolvió el empate de ${cargo.nombre} (puesto ${puesto}) a favor de ${candidato?.nombreCompleto ?? "un candidato"}.`,
    await obtenerIp(),
  );
  refrescar();
  return { ok: true, mensaje: `Empate resuelto: ${candidato?.nombreCompleto ?? "candidato"}.` };
}
