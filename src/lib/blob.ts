// Catálogo, guía de tallas, colecciones y config del sitio — todo vive en
// Postgres/Supabase (ver supabase/migrations/20260910000000_init_schema.sql
// y siguientes) y las imágenes en el bucket público de Storage. Ya no
// depende de Vercel Blob (migración completa).

import { cache } from "react";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { crearClienteServidor } from "./supabase";
import { slugify } from "./transform";
import type {
  Catalogo,
  Coleccion,
  ConfigSitio,
  EntradaHistorial,
  GuiaTallas,
  LogoFooter,
  Producto,
  ResumenImportacion,
} from "./types";
import { logError } from "./logger";

// =============================================================================
// Catálogo (Postgres) — cargas / catalogo_activo / productos / variantes_color
// / curvas / tallas. Ver supabase/migrations para el esquema y las políticas
// RLS (puede_escribir_catalogo(), publico_lee_productos, etc.)
// =============================================================================

interface FilaTallaDB {
  talla: string;
  disponible: number;
  disponible_fisico: number;
  por_bulto: number | null;
}

interface FilaCurvaDB {
  rango: string;
  codigo_sap: string;
  cantidad_por_bulto: number;
  tallas: FilaTallaDB[];
}

interface FilaVarianteDB {
  color: string;
  precio: number | string; // numeric de Postgres puede volver como string
  promocion: boolean;
  fotos: string[];
  curvas: FilaCurvaDB[];
}

interface FilaProductoDB {
  slug: string;
  modelo: string;
  marca: string;
  genero: string;
  rubro: string;
  linea: string | null;
  codigo_modelo: string | null;
  material_exterior: string | null;
  material_interior: string | null;
  material_suela: string | null;
  tipo_calzado: string | null;
  variantes_color: FilaVarianteDB[];
}

function mapearProductoDesdeDB(p: FilaProductoDB): Producto {
  const tieneMateriales = p.material_exterior || p.material_interior || p.material_suela || p.tipo_calzado;
  return {
    id: p.slug,
    modelo: p.modelo,
    marca: p.marca,
    genero: p.genero,
    rubro: p.rubro,
    linea: p.linea ?? undefined,
    codigoModelo: p.codigo_modelo ?? undefined,
    materiales: tieneMateriales
      ? {
          exterior: p.material_exterior ?? undefined,
          interior: p.material_interior ?? undefined,
          suela: p.material_suela ?? undefined,
          tipoCalzado: p.tipo_calzado ?? undefined,
        }
      : undefined,
    colores: (p.variantes_color ?? []).map((c) => ({
      color: c.color,
      precio: Number(c.precio),
      promocion: c.promocion,
      fotos: c.fotos ?? [],
      // Mismo criterio que transform.ts al armar el catálogo original — ver
      // la nota ahí (slugify exportado a propósito para esto).
      curvas: (c.curvas ?? []).map((curva) => ({
        id: slugify(curva.rango) || "unico",
        rango: curva.rango,
        codigoSap: curva.codigo_sap,
        cantidadPorBulto: curva.cantidad_por_bulto,
        tallas: (curva.tallas ?? []).map((t) => ({
          talla: t.talla,
          disponible: t.disponible,
          disponibleFisico: t.disponible_fisico,
          porBulto: t.por_bulto ?? undefined,
        })),
      })),
    })),
  };
}

const SELECT_ARBOL_PRODUCTOS = `
  slug, modelo, marca, genero, rubro, linea, codigo_modelo,
  material_exterior, material_interior, material_suela, tipo_calzado,
  variantes_color (
    color, precio, promocion, fotos,
    curvas (
      rango, codigo_sap, cantidad_por_bulto,
      tallas ( talla, disponible, disponible_fisico, por_bulto )
    )
  )
`;

async function construirCatalogoDesdeCarga(supabase: SupabaseClient, cargaId: string): Promise<Catalogo | null> {
  const { data: carga, error: errorCarga } = await supabase
    .from("cargas")
    .select("total_productos, total_variantes, creado_en")
    .eq("id", cargaId)
    .maybeSingle();
  if (errorCarga) throw errorCarga;
  if (!carga) return null;

  const { data: productos, error } = await supabase
    .from("productos")
    .select(SELECT_ARBOL_PRODUCTOS)
    .eq("carga_id", cargaId);
  if (error) throw error;

  return {
    productos: ((productos ?? []) as unknown as FilaProductoDB[]).map(mapearProductoDesdeDB),
    generadoEn: carga.creado_en as string,
    totalProductos: carga.total_productos as number,
    totalVariantes: carga.total_variantes as number,
  };
}

// Ids generados en el cliente (no RETURNING): así los hijos pueden
// referenciar el id del padre sin depender del orden en que Postgres
// devuelva las filas de un insert múltiple.
async function insertarEnLotes(supabase: SupabaseClient, tabla: string, filas: Record<string, unknown>[], tamanoLote = 500) {
  for (let i = 0; i < filas.length; i += tamanoLote) {
    const lote = filas.slice(i, i + tamanoLote);
    const { error } = await supabase.from(tabla).insert(lote);
    if (error) throw error;
  }
}

async function insertarArbolCatalogo(supabase: SupabaseClient, cargaId: string, productos: Producto[]): Promise<void> {
  const filasProductos: Record<string, unknown>[] = [];
  const filasVariantes: Record<string, unknown>[] = [];
  const filasCurvas: Record<string, unknown>[] = [];
  const filasTallas: Record<string, unknown>[] = [];

  for (const p of productos) {
    const idProducto = randomUUID();
    filasProductos.push({
      id: idProducto,
      carga_id: cargaId,
      slug: p.id,
      modelo: p.modelo,
      marca: p.marca,
      genero: p.genero,
      rubro: p.rubro,
      linea: p.linea ?? null,
      codigo_modelo: p.codigoModelo ?? null,
      material_exterior: p.materiales?.exterior ?? null,
      material_interior: p.materiales?.interior ?? null,
      material_suela: p.materiales?.suela ?? null,
      tipo_calzado: p.materiales?.tipoCalzado ?? null,
    });

    for (const c of p.colores) {
      const idVariante = randomUUID();
      filasVariantes.push({
        id: idVariante,
        producto_id: idProducto,
        color: c.color,
        precio: c.precio,
        promocion: c.promocion,
        fotos: c.fotos,
      });

      for (const curva of c.curvas) {
        const idCurva = randomUUID();
        filasCurvas.push({
          id: idCurva,
          variante_id: idVariante,
          rango: curva.rango,
          codigo_sap: curva.codigoSap,
          cantidad_por_bulto: curva.cantidadPorBulto,
        });

        for (const t of curva.tallas) {
          filasTallas.push({
            id: randomUUID(),
            curva_id: idCurva,
            talla: t.talla,
            disponible: t.disponible,
            disponible_fisico: t.disponibleFisico,
            por_bulto: t.porBulto ?? null,
          });
        }
      }
    }
  }

  await insertarEnLotes(supabase, "productos", filasProductos);
  await insertarEnLotes(supabase, "variantes_color", filasVariantes);
  await insertarEnLotes(supabase, "curvas", filasCurvas);
  await insertarEnLotes(supabase, "tallas", filasTallas);
}

// cache() (React): generateMetadata() y el Page de /producto/[id] llaman
// esto por separado dentro de la misma request — sin esto, cada visita a esa
// ruta traía el catálogo entero DOS veces.
export const leerCatalogoPublico = cache(async (): Promise<Catalogo | null> => {
  const supabase = await crearClienteServidor();
  const { data: activo, error } = await supabase.from("catalogo_activo").select("carga_id").eq("id", true).maybeSingle();
  if (error) {
    logError("lib/blob.leerCatalogoPublico", error);
    return null;
  }
  if (!activo?.carga_id) return null;
  return construirCatalogoDesdeCarga(supabase, activo.carga_id as string);
});

export interface MetaArchivoOriginal {
  nombreArchivo: string;
  contentType: string;
}

export interface ArchivoOriginal {
  bytes: ArrayBuffer;
  meta: MetaArchivoOriginal;
}

const BUCKET_PRIVADO = "privado";

/**
 * Guarda el catálogo entero (árbol completo) como una nueva carga
 * "pendiente" — reemplaza cualquier pendiente anterior (una sola a la vez,
 * igual que el PENDING_KEY de antes). `origen` arranca en "archivo" porque
 * la columna es NOT NULL y todavía no se sabe si hay archivo real o vino de
 * un link de Google Sheets — se corrige solo, más abajo, en
 * guardarArchivoOriginalPendiente() o limpiarArchivoOriginalPendiente() (el
 * caller en api/admin/upload SIEMPRE llama a una de las dos después de esto).
 */
export async function guardarCatalogoPendiente(catalogo: Catalogo): Promise<void> {
  const supabase = await crearClienteServidor();

  const { data: viejo } = await supabase
    .from("cargas")
    .select("id, archivo_original_path")
    .eq("estado", "pendiente")
    .maybeSingle();
  if (viejo) {
    if (viejo.archivo_original_path) {
      await supabase.storage.from(BUCKET_PRIVADO).remove([viejo.archivo_original_path as string]).catch(() => {});
    }
    // Cascada (ON DELETE CASCADE): se lleva productos/variantes/curvas/tallas de esa carga.
    await supabase.from("cargas").delete().eq("id", viejo.id);
  }

  const { data: nueva, error } = await supabase
    .from("cargas")
    .insert({ estado: "pendiente", origen: "archivo", total_productos: catalogo.totalProductos, total_variantes: catalogo.totalVariantes })
    .select("id")
    .single();
  if (error) throw error;

  await insertarArbolCatalogo(supabase, nueva.id as string, catalogo.productos);
}

export async function leerCatalogoPendiente(): Promise<Catalogo | null> {
  const supabase = await crearClienteServidor();
  const { data: pendiente } = await supabase.from("cargas").select("id").eq("estado", "pendiente").maybeSingle();
  if (!pendiente) return null;
  return construirCatalogoDesdeCarga(supabase, pendiente.id as string);
}

/** Resumen (errores incluidos) de la carga pendiente — se guarda sobre la misma fila de `cargas`. */
export async function guardarResumenPendiente(resumen: ResumenImportacion): Promise<void> {
  const supabase = await crearClienteServidor();
  const totalSinFoto = resumen.errores.filter((e) => /sin foto/i.test(e.motivo)).length;
  const { error } = await supabase
    .from("cargas")
    .update({ total_errores: resumen.errores.length, total_sin_foto: totalSinFoto, errores: resumen.errores })
    .eq("estado", "pendiente");
  if (error) throw error;
}

/**
 * Reconstruye un ResumenImportacion desde la carga pendiente. `cargas` no
 * guarda totalFilasOrigen/columnasFaltantes/mensaje (no hay columna para
 * eso) — se aproxima con lo que sí está.
 */
export async function leerResumenPendiente(): Promise<ResumenImportacion | null> {
  const supabase = await crearClienteServidor();
  const { data: pendiente } = await supabase
    .from("cargas")
    .select("total_productos, total_variantes, errores")
    .eq("estado", "pendiente")
    .maybeSingle();
  if (!pendiente) return null;
  return {
    ok: true,
    totalFilasOrigen: pendiente.total_variantes as number,
    totalProductos: pendiente.total_productos as number,
    totalVariantes: pendiente.total_variantes as number,
    errores: (pendiente.errores as ResumenImportacion["errores"]) ?? [],
  };
}

/**
 * Promueve el catálogo pendiente a catálogo publicado: switch atómico del
 * puntero `catalogo_activo.carga_id` — a diferencia del backup+overwrite de
 * antes, acá no se copia nada: la carga pendiente YA tiene su árbol completo
 * propio, solo cambia de estado y pasa a ser la que apunta catalogo_activo.
 * La carga que era publicada pasa a "descartada" (queda como respaldo/
 * historial, no se borra).
 */
export async function confirmarReemplazoCatalogo(): Promise<Catalogo> {
  const supabase = await crearClienteServidor();

  const { data: pendiente } = await supabase.from("cargas").select("id").eq("estado", "pendiente").maybeSingle();
  if (!pendiente) {
    throw new Error("No hay un catálogo pendiente por confirmar. Vuelve a cargar el archivo.");
  }

  const { data: activo } = await supabase.from("catalogo_activo").select("carga_id").eq("id", true).maybeSingle();
  const cargaAnteriorId = (activo?.carga_id as string | null) ?? null;

  const { error: errorPuntero } = await supabase.from("catalogo_activo").update({ carga_id: pendiente.id }).eq("id", true);
  if (errorPuntero) throw errorPuntero;

  await supabase.from("cargas").update({ estado: "publicada" }).eq("id", pendiente.id);
  if (cargaAnteriorId) {
    await supabase.from("cargas").update({ estado: "descartada" }).eq("id", cargaAnteriorId);
  }

  const catalogo = await construirCatalogoDesdeCarga(supabase, pendiente.id as string);
  if (!catalogo) throw new Error("La carga se confirmó pero no se pudo releer el catálogo recién publicado.");
  return catalogo;
}

export async function leerCatalogoBackup(): Promise<Catalogo | null> {
  const supabase = await crearClienteServidor();
  const { data: backup } = await supabase
    .from("cargas")
    .select("id")
    .eq("estado", "descartada")
    .not("total_productos", "eq", 0) // descarta registros puramente de historial ("revertir"), que no tienen árbol propio
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!backup) return null;
  return construirCatalogoDesdeCarga(supabase, backup.id as string);
}

/** Revierte al respaldo (la carga "descartada" más reciente con árbol propio), si existe. */
export async function revertirABackup(): Promise<Catalogo> {
  const supabase = await crearClienteServidor();

  const { data: activo } = await supabase.from("catalogo_activo").select("carga_id").eq("id", true).maybeSingle();
  const { data: backup } = await supabase
    .from("cargas")
    .select("id, total_productos, total_variantes")
    .eq("estado", "descartada")
    .not("total_productos", "eq", 0)
    .order("creado_en", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!backup) {
    throw new Error("No hay respaldo disponible para revertir.");
  }

  await supabase.from("catalogo_activo").update({ carga_id: backup.id }).eq("id", true);
  await supabase.from("cargas").update({ estado: "publicada" }).eq("id", backup.id);
  if (activo?.carga_id) {
    await supabase.from("cargas").update({ estado: "descartada" }).eq("id", activo.carga_id);
  }

  // Registro del evento en sí (mismo criterio que antes: un revert también
  // es un cambio real al catálogo publicado, queda en el historial). Fila
  // "liviana": sin árbol de productos propio — solo un marcador con fecha de
  // HOY, para que el historial muestre "revertido" en el momento real en que
  // pasó (la fila de `backup` conserva su fecha de publicación original).
  await supabase.from("cargas").insert({
    estado: "descartada",
    origen: "revertir",
    total_productos: backup.total_productos,
    total_variantes: backup.total_variantes,
  });

  const catalogo = await construirCatalogoDesdeCarga(supabase, backup.id as string);
  if (!catalogo) throw new Error("Se revirtió pero no se pudo releer el catálogo restaurado.");
  return catalogo;
}

/** Guarda el archivo crudo (.csv/.xlsx) de la carga pendiente en el bucket privado. No crítico: si falla, el catálogo en sí ya se guardó bien. */
export async function guardarArchivoOriginalPendiente(bytes: ArrayBuffer, meta: MetaArchivoOriginal): Promise<void> {
  try {
    const supabase = await crearClienteServidor();
    const { data: pendiente } = await supabase.from("cargas").select("id").eq("estado", "pendiente").maybeSingle();
    if (!pendiente) return;

    const path = `original/${pendiente.id}`;
    const { error: errorSubida } = await supabase.storage.from(BUCKET_PRIVADO).upload(path, bytes, {
      contentType: meta.contentType,
      upsert: true,
    });
    if (errorSubida) throw errorSubida;

    const { error } = await supabase
      .from("cargas")
      .update({ origen: "archivo", nombre_archivo: meta.nombreArchivo, archivo_original_path: path, archivo_original_content_type: meta.contentType })
      .eq("id", pendiente.id);
    if (error) throw error;
  } catch (err) {
    logError("lib/blob.guardarArchivoOriginalPendiente", err);
  }
}

/** Origen "Google Sheets": no hay archivo que guardar — la carga pendiente queda marcada así. */
export async function limpiarArchivoOriginalPendiente(): Promise<void> {
  const supabase = await crearClienteServidor();
  const { data: pendiente } = await supabase
    .from("cargas")
    .select("id, archivo_original_path")
    .eq("estado", "pendiente")
    .maybeSingle();
  if (!pendiente) return;

  if (pendiente.archivo_original_path) {
    await supabase.storage.from(BUCKET_PRIVADO).remove([pendiente.archivo_original_path as string]).catch(() => {});
  }
  await supabase
    .from("cargas")
    .update({ origen: "google_sheets", nombre_archivo: null, archivo_original_path: null, archivo_original_content_type: null })
    .eq("id", pendiente.id);
}

/** El archivo (.csv/.xlsx) que generó el catálogo actualmente publicado, si lo hay. */
export async function leerArchivoOriginal(): Promise<ArchivoOriginal | null> {
  const supabase = await crearClienteServidor();
  const { data: activo } = await supabase.from("catalogo_activo").select("carga_id").eq("id", true).maybeSingle();
  if (!activo?.carga_id) return null;

  const { data: carga } = await supabase
    .from("cargas")
    .select("nombre_archivo, archivo_original_path, archivo_original_content_type")
    .eq("id", activo.carga_id)
    .maybeSingle();
  if (!carga?.archivo_original_path) return null;

  const { data: archivo, error } = await supabase.storage.from(BUCKET_PRIVADO).download(carga.archivo_original_path as string);
  if (error || !archivo) return null;

  return {
    bytes: await archivo.arrayBuffer(),
    meta: {
      nombreArchivo: (carga.nombre_archivo as string | null) ?? "catalogo",
      contentType: (carga.archivo_original_content_type as string | null) ?? archivo.type ?? "application/octet-stream",
    },
  };
}

/** Las cargas confirmadas (publicadas o reemplazadas) más recientes primero — un registro por cada carga CONFIRMADA, no cada análisis. */
export async function leerHistorial(limite = 20): Promise<EntradaHistorial[]> {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("cargas")
    .select("id, creado_en, origen, nombre_archivo, total_productos, total_variantes, total_errores, total_sin_foto")
    .neq("estado", "pendiente")
    .order("creado_en", { ascending: false })
    .limit(limite);
  if (error) {
    logError("lib/blob.leerHistorial", error);
    return [];
  }
  return (data ?? []).map((h) => ({
    id: h.id as string,
    fecha: h.creado_en as string,
    origen: h.origen as EntradaHistorial["origen"],
    nombreArchivo: h.nombre_archivo as string | null,
    totalProductos: h.total_productos as number,
    totalVariantes: h.total_variantes as number,
    totalErrores: h.total_errores as number,
    totalSinFoto: h.total_sin_foto as number,
  }));
}

// =============================================================================
// Guía de tallas, colecciones, config-sitio — en Postgres (tablas singleton
// guia_tallas/config_sitio, tabla colecciones). Imágenes — en el bucket
// PÚBLICO de Supabase Storage ("publico"), URL directa sin proxy.
// =============================================================================

const BUCKET_PUBLICO = "publico";

/**
 * Sube una imagen que el navegador del comprador necesita poder ver directo
 * (portada de colección, guía de tallas, fondo de login) al bucket público
 * de Storage — a diferencia del bucket "privado" (archivo original del
 * catálogo), este SÍ es público desde su creación, así que la URL que
 * devuelve `getPublicUrl` ya sirve tal cual, sin pasar por ningún proxy.
 * `prefijo` reusa el mismo esquema de carpetas que tenía Blob
 * ("colecciones/", "guia-tallas/", "login/") y el nombre lleva un uuid
 * como prefijo para no pisar un archivo existente (equivalente al
 * addRandomSuffix de Blob).
 */
async function subirImagenPublica(prefijo: string, nombre: string, bytes: ArrayBuffer, contentType: string): Promise<string> {
  const supabase = await crearClienteServidor();
  const path = `${prefijo}/${randomUUID()}-${nombre}`;
  const { error } = await supabase.storage.from(BUCKET_PUBLICO).upload(path, bytes, { contentType, upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET_PUBLICO).getPublicUrl(path);
  return data.publicUrl;
}

export async function subirImagenGuiaTallas(nombre: string, bytes: ArrayBuffer, contentType: string): Promise<string> {
  return subirImagenPublica("guia-tallas", nombre, bytes, contentType);
}

export async function subirImagenColeccion(nombre: string, bytes: ArrayBuffer, contentType: string): Promise<string> {
  return subirImagenPublica("colecciones", nombre, bytes, contentType);
}

export async function subirImagenFondoLogin(nombre: string, bytes: ArrayBuffer, contentType: string): Promise<string> {
  return subirImagenPublica("login", nombre, bytes, contentType);
}

export async function subirImagenLogoMarca(nombre: string, bytes: ArrayBuffer, contentType: string): Promise<string> {
  return subirImagenPublica("logo-marca", nombre, bytes, contentType);
}

export async function subirImagenLogoFooter(nombre: string, bytes: ArrayBuffer, contentType: string): Promise<string> {
  return subirImagenPublica("logos-footer", nombre, bytes, contentType);
}

/** Config actual de la guía de tallas (instrucciones + tabla). Nunca falta: si no se configuró aún, ambos campos vienen en null. */
export const leerGuiaTallas = cache(async (): Promise<GuiaTallas> => {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("guia_tallas").select("instrucciones_url, tabla_url").eq("id", true).maybeSingle();
  if (error) {
    logError("lib/blob.leerGuiaTallas", error);
    return { instrucciones: null, tabla: null };
  }
  return { instrucciones: (data?.instrucciones_url as string | null) ?? null, tabla: (data?.tabla_url as string | null) ?? null };
});

export async function guardarGuiaTallas(guia: GuiaTallas): Promise<void> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("guia_tallas")
    .upsert({ id: true, instrucciones_url: guia.instrucciones, tabla_url: guia.tabla, actualizado_en: new Date().toISOString() }, { onConflict: "id" });
  if (error) throw error;
}

// cache() — ver la nota sobre leerCatalogoPublico más arriba: mismo motivo.
export const leerColecciones = cache(async (): Promise<Coleccion[]> => {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("colecciones").select("id, nombre, imagen_url, filtro").order("orden", { ascending: true });
  if (error) {
    logError("lib/blob.leerColecciones", error);
    return [];
  }
  return (data ?? []).map((c) => ({
    id: c.id as string,
    nombre: c.nombre as string,
    imagenUrl: c.imagen_url as string | null,
    filtro: (c.filtro as Coleccion["filtro"]) ?? {},
  }));
});

/** Reemplaza la lista entera (mismo contrato que antes: el panel manda alta/edición/borrado/reorden ya aplicados sobre la lista completa). */
export async function guardarColecciones(colecciones: Coleccion[]): Promise<void> {
  const supabase = await crearClienteServidor();
  const { error: errorBorrado } = await supabase.from("colecciones").delete().not("id", "is", null);
  if (errorBorrado) throw errorBorrado;
  if (colecciones.length === 0) return;

  const filas = colecciones.map((c, i) => ({ id: c.id, nombre: c.nombre, imagen_url: c.imagenUrl, filtro: c.filtro, orden: i }));
  const { error: errorInsercion } = await supabase.from("colecciones").insert(filas);
  if (errorInsercion) throw errorInsercion;
}

// --- Logos de marca del footer ("Nuestras marcas") -----------------------
// Mismo patrón que colecciones: el panel maneja alta/edición/borrado/orden
// como una lista completa en memoria y la guarda de una vez (reemplazo total
// — borra todo e inserta de nuevo, ver guardarColecciones).
export const leerLogosFooter = cache(async (): Promise<LogoFooter[]> => {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase.from("logos_footer").select("id, nombre, imagen_url, visible").order("orden", { ascending: true });
  if (error) {
    logError("lib/blob.leerLogosFooter", error);
    return [];
  }
  return (data ?? []).map((l) => ({
    id: l.id as string,
    nombre: l.nombre as string,
    imagenUrl: l.imagen_url as string | null,
    visible: l.visible as boolean,
  }));
});

export async function guardarLogosFooter(logos: LogoFooter[]): Promise<void> {
  const supabase = await crearClienteServidor();
  const { error: errorBorrado } = await supabase.from("logos_footer").delete().not("id", "is", null);
  if (errorBorrado) throw errorBorrado;
  if (logos.length === 0) return;

  const filas = logos.map((l, i) => ({ id: l.id, nombre: l.nombre, imagen_url: l.imagenUrl, visible: l.visible, orden: i }));
  const { error: errorInsercion } = await supabase.from("logos_footer").insert(filas);
  if (errorInsercion) throw errorInsercion;
}

// --- Configuración del sitio ---------------------------------------------
// Valores operativos editables desde /admin/configuracion (WhatsApp de
// ventas, datos de contacto del footer) que antes solo se podían cambiar
// desde Vercel (variable de entorno) o estaban fijos en el código. Todos
// los campos son opcionales — si no están configurados acá, cada lugar que
// los usa cae a su valor por defecto (ver CONFIG_SITIO_VACIA).
export const CONFIG_SITIO_VACIA: ConfigSitio = {
  whatsappVentas: null,
  descripcionEmpresa: null,
  rif: null,
  fondoLoginUrl: null,
  logoUrl: null,
  logoVisible: true,
  razonSocial: "Calzados Mesvol, C.A.",
  tituloPlataforma: null,
};

// cache() — layout.tsx, page.tsx y producto/[id]/page.tsx llaman esto cada
// uno por su cuenta dentro de la misma request (config del footer). Sin
// esto eran hasta 3 lecturas idénticas por visita.
export const leerConfigSitio = cache(async (): Promise<ConfigSitio> => {
  const supabase = await crearClienteServidor();
  const { data, error } = await supabase
    .from("config_sitio")
    .select("whatsapp_ventas, descripcion_empresa, rif, fondo_login_url, logo_url, logo_visible, razon_social, titulo_plataforma")
    .eq("id", true)
    .maybeSingle();
  if (error) {
    logError("lib/blob.leerConfigSitio", error);
    return CONFIG_SITIO_VACIA;
  }
  if (!data) return CONFIG_SITIO_VACIA;
  return {
    whatsappVentas: data.whatsapp_ventas as string | null,
    descripcionEmpresa: data.descripcion_empresa as string | null,
    rif: data.rif as string | null,
    fondoLoginUrl: data.fondo_login_url as string | null,
    logoUrl: data.logo_url as string | null,
    logoVisible: data.logo_visible as boolean,
    razonSocial: (data.razon_social as string) || CONFIG_SITIO_VACIA.razonSocial,
    tituloPlataforma: data.titulo_plataforma as string | null,
  };
});

export async function guardarConfigSitio(config: ConfigSitio): Promise<void> {
  const supabase = await crearClienteServidor();
  const { error } = await supabase
    .from("config_sitio")
    .upsert(
      {
        id: true,
        whatsapp_ventas: config.whatsappVentas,
        descripcion_empresa: config.descripcionEmpresa,
        rif: config.rif,
        fondo_login_url: config.fondoLoginUrl,
        logo_url: config.logoUrl,
        logo_visible: config.logoVisible,
        razon_social: config.razonSocial,
        titulo_plataforma: config.tituloPlataforma,
        actualizado_en: new Date().toISOString(),
      },
      { onConflict: "id" },
    );
  if (error) throw error;
}
