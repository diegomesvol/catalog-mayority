// Fase 0 de la migración Blob -> Supabase: copia el estado actual de Vercel
// Blob (catálogo publicado + historial, colecciones, guía de tallas,
// config-sitio, y las imágenes subidas por el admin) hacia las tablas
// nuevas + el bucket "publico" de Supabase Storage.
//
// Corre UNA sola vez, a mano, desde tu máquina (acá en el sandbox no tengo
// el BLOB_READ_WRITE_TOKEN real). No toca lib/blob.ts ni el sitio en
// producción — el código sigue leyendo de Blob hasta la Fase 1. Esto solo
// puebla las tablas para que esa fase tenga con qué trabajar.
//
// Uso (PowerShell, desde la raíz del proyecto):
//   node scripts/backfill-supabase.mjs
//
// Necesita en .env.local: BLOB_READ_WRITE_TOKEN, NEXT_PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY (la service role, no la anon — este script
// bypassea RLS a propósito, no corre como ningún admin en particular).
//
// Es seguro re-ejecutar en el sentido de que no rompe nada, pero NO es
// idempotente: si ya corrió una vez, aborta con un aviso en vez de duplicar
// filas (ver chequeoIdempotencia). Si de verdad querés repetirlo desde cero,
// vaciá las tablas primero (SQL) y volvé a correr.

import { readFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { list, get } from "@vercel/blob";
import { createClient } from "@supabase/supabase-js";

// --- Carga manual de .env.local (sin depender de "dotenv" ni de que el
// Node del usuario soporte --env-file) -------------------------------------
function cargarEnvLocal() {
  const ruta = new URL("../.env.local", import.meta.url);
  if (!existsSync(ruta)) {
    console.error("No existe .env.local en la raíz del proyecto — creá uno con las 4 variables que necesita este script (ver el comentario arriba).");
    process.exit(1);
  }
  const texto = readFileSync(ruta, "utf8");
  for (const linea of texto.split("\n")) {
    const l = linea.trim();
    if (!l || l.startsWith("#")) continue;
    const idx = l.indexOf("=");
    if (idx === -1) continue;
    const clave = l.slice(0, idx).trim();
    let valor = l.slice(idx + 1).trim();
    if ((valor.startsWith('"') && valor.endsWith('"')) || (valor.startsWith("'") && valor.endsWith("'"))) {
      valor = valor.slice(1, -1);
    }
    if (!(clave in process.env)) process.env[clave] = valor;
  }
}
cargarEnvLocal();

function requireEnv(nombre) {
  const valor = process.env[nombre];
  if (!valor) {
    console.error(`Falta ${nombre} en .env.local`);
    process.exit(1);
  }
  return valor;
}

const BLOB_TOKEN = requireEnv("BLOB_READ_WRITE_TOKEN");
const SUPABASE_URL = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
const SERVICE_ROLE_KEY = requireEnv("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// --- Helpers de lectura de Blob (mismo criterio que lib/blob.ts, reescritos
// acá standalone para no arrastrar imports de Next/React al script) --------
async function leerJsonBlob(key) {
  try {
    const resultado = await get(key, { access: "private", token: BLOB_TOKEN });
    if (!resultado || resultado.statusCode !== 200) return null;
    const texto = await new Response(resultado.stream).text();
    return JSON.parse(texto);
  } catch (err) {
    if (/BlobNotFoundError|not_found/i.test(String(err?.message ?? err))) return null;
    throw err;
  }
}

async function leerBinarioBlob(pathname) {
  const resultado = await get(pathname, { access: "private", token: BLOB_TOKEN });
  if (!resultado || resultado.statusCode !== 200 || !resultado.stream) return null;
  const bytes = await new Response(resultado.stream).arrayBuffer();
  return { bytes, contentType: resultado.blob?.contentType ?? "application/octet-stream" };
}

// --- Re-sube una imagen que hoy vive en Blob bajo /api/imagenes/<pathname>
// hacia el bucket "publico" de Storage, en el mismo pathname relativo (ej.
// "colecciones/foo-ab12.jpg"). Si la URL es externa (no empieza con
// "/api/imagenes/"), se deja tal cual — no hay nada que migrar. -----------
const cacheImagenesMigradas = new Map();

async function migrarImagenSiHaceFalta(url) {
  if (!url) return url;
  if (!url.startsWith("/api/imagenes/")) return url; // URL externa pegada a mano, no toca Blob
  if (cacheImagenesMigradas.has(url)) return cacheImagenesMigradas.get(url);

  const pathname = url.replace(/^\/api\/imagenes\//, "");
  const archivo = await leerBinarioBlob(pathname);
  if (!archivo) {
    console.warn(`  ! No se encontró en Blob la imagen referenciada: ${pathname} — se deja la URL vieja (va a dar 404).`);
    cacheImagenesMigradas.set(url, url);
    return url;
  }

  const { error } = await supabase.storage.from("publico").upload(pathname, archivo.bytes, {
    contentType: archivo.contentType,
    upsert: true,
  });
  if (error) throw new Error(`Subiendo ${pathname} a Storage: ${error.message}`);

  const { data } = supabase.storage.from("publico").getPublicUrl(pathname);
  console.log(`  imagen migrada: ${pathname} -> ${data.publicUrl}`);
  cacheImagenesMigradas.set(url, data.publicUrl);
  return data.publicUrl;
}

// --- Inserts en lote, con id generado en el cliente (así los hijos pueden
// referenciar el id del padre sin depender del orden de un RETURNING). ----
async function insertarEnLotes(tabla, filas, tamanoLote = 500) {
  for (let i = 0; i < filas.length; i += tamanoLote) {
    const lote = filas.slice(i, i + tamanoLote);
    const { error } = await supabase.from(tabla).insert(lote);
    if (error) throw new Error(`Insertando en ${tabla} (filas ${i}-${i + lote.length}): ${error.message}`);
  }
}

async function chequeoIdempotencia() {
  const { count, error } = await supabase.from("cargas").select("id", { count: "exact", head: true });
  if (error) throw new Error(`Verificando estado de "cargas": ${error.message}`);
  if (count && count > 0) {
    console.error(`La tabla "cargas" ya tiene ${count} fila(s) — este script ya corrió antes (o alguien cargó datos a mano). Abortando para no duplicar. Si de verdad querés repetirlo, vaciá las tablas del catálogo primero.`);
    process.exit(1);
  }
}

// --- Catálogo + historial --------------------------------------------------
async function migrarCatalogoEHistorial() {
  console.log("\n== Catálogo + historial ==");

  const catalogoActual = await leerJsonBlob("catalogo.json");
  const { blobs: blobsHistorial } = await list({ prefix: "historial/", limit: 1000, token: BLOB_TOKEN });
  const historial = (
    await Promise.all(blobsHistorial.map((b) => leerJsonBlob(b.pathname)))
  ).filter(Boolean);
  historial.sort((a, b) => (a.fecha < b.fecha ? 1 : -1)); // más nuevo primero, igual que leerHistorial

  if (!catalogoActual && historial.length === 0) {
    console.log("  No hay catálogo publicado ni historial en Blob — nada que migrar acá.");
    return;
  }

  // Historial viejo: se guarda como registro (para que /admin/catalogo siga
  // mostrando la lista), pero SIN árbol de productos propio — Blob nunca
  // guardó snapshots completos de cargas viejas, solo el conteo. La entrada
  // más nueva del historial es la que corresponde al catálogo.json actual
  // (si existe) y esa sí se llena con el árbol completo.
  const masNueva = historial[0] ?? null;
  const idCargaActiva = randomUUID();
  const filasCargas = [];

  if (catalogoActual) {
    filasCargas.push({
      id: idCargaActiva,
      estado: "publicada",
      origen: masNueva?.origen ?? "archivo",
      nombre_archivo: masNueva?.nombreArchivo ?? null,
      total_productos: catalogoActual.totalProductos,
      total_variantes: catalogoActual.totalVariantes,
      total_errores: masNueva?.totalErrores ?? 0,
      total_sin_foto: masNueva?.totalSinFoto ?? 0,
      errores: [],
      creado_en: masNueva?.fecha ?? catalogoActual.generadoEn,
    });
  }

  const historialParaLog = catalogoActual ? historial.slice(1) : historial;
  for (const h of historialParaLog) {
    filasCargas.push({
      id: randomUUID(),
      estado: "descartada",
      origen: h.origen,
      nombre_archivo: h.nombreArchivo,
      total_productos: h.totalProductos,
      total_variantes: h.totalVariantes,
      total_errores: h.totalErrores,
      total_sin_foto: h.totalSinFoto,
      errores: [],
      creado_en: h.fecha,
    });
  }

  if (filasCargas.length > 0) {
    await insertarEnLotes("cargas", filasCargas);
    console.log(`  cargas: ${filasCargas.length} fila(s) insertada(s) (${catalogoActual ? 1 : 0} con árbol de productos, ${filasCargas.length - (catalogoActual ? 1 : 0)} solo de registro histórico).`);
  }

  if (!catalogoActual) return;

  // Árbol completo del catálogo activo.
  const filasProductos = [];
  const filasVariantes = [];
  const filasCurvas = [];
  const filasTallas = [];

  for (const p of catalogoActual.productos) {
    const idProducto = randomUUID();
    filasProductos.push({
      id: idProducto,
      carga_id: idCargaActiva,
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

  await insertarEnLotes("productos", filasProductos);
  await insertarEnLotes("variantes_color", filasVariantes);
  await insertarEnLotes("curvas", filasCurvas);
  await insertarEnLotes("tallas", filasTallas);
  console.log(`  productos: ${filasProductos.length} · variantes: ${filasVariantes.length} · curvas: ${filasCurvas.length} · tallas: ${filasTallas.length}`);

  const { error: errorPuntero } = await supabase.from("catalogo_activo").update({ carga_id: idCargaActiva }).eq("id", true);
  if (errorPuntero) throw new Error(`Actualizando catalogo_activo: ${errorPuntero.message}`);
  console.log("  catalogo_activo.carga_id -> apunta a la carga recién migrada.");
}

// --- Colecciones ------------------------------------------------------------
async function migrarColecciones() {
  console.log("\n== Colecciones ==");
  const colecciones = (await leerJsonBlob("colecciones.json")) ?? [];
  if (colecciones.length === 0) {
    console.log("  No hay colecciones guardadas en Blob.");
    return;
  }

  const filas = [];
  for (let i = 0; i < colecciones.length; i++) {
    const c = colecciones[i];
    const imagenUrl = await migrarImagenSiHaceFalta(c.imagenUrl);
    filas.push({
      id: randomUUID(),
      nombre: c.nombre,
      imagen_url: imagenUrl,
      filtro: c.filtro ?? {},
      orden: i,
    });
  }
  await insertarEnLotes("colecciones", filas);
  console.log(`  colecciones: ${filas.length} fila(s) insertada(s).`);
}

// --- Guía de tallas ---------------------------------------------------------
async function migrarGuiaTallas() {
  console.log("\n== Guía de tallas ==");
  const guia = await leerJsonBlob("guia-tallas.json");
  if (!guia || (!guia.instrucciones && !guia.tabla)) {
    console.log("  No hay guía de tallas configurada en Blob.");
    return;
  }
  const instruccionesUrl = await migrarImagenSiHaceFalta(guia.instrucciones);
  const tablaUrl = await migrarImagenSiHaceFalta(guia.tabla);
  const { error } = await supabase
    .from("guia_tallas")
    .update({ instrucciones_url: instruccionesUrl, tabla_url: tablaUrl })
    .eq("id", true);
  if (error) throw new Error(`Actualizando guia_tallas: ${error.message}`);
  console.log("  guia_tallas actualizada.");
}

// --- Config del sitio --------------------------------------------------------
async function migrarConfigSitio() {
  console.log("\n== Config del sitio ==");
  const config = await leerJsonBlob("config-sitio.json");
  if (!config) {
    console.log("  No hay config-sitio.json en Blob (todo por defecto).");
    return;
  }
  const fondoLoginUrl = await migrarImagenSiHaceFalta(config.fondoLoginUrl);
  const { error } = await supabase
    .from("config_sitio")
    .update({
      whatsapp_ventas: config.whatsappVentas ?? null,
      descripcion_empresa: config.descripcionEmpresa ?? null,
      rif: config.rif ?? null,
      fondo_login_url: fondoLoginUrl ?? null,
    })
    .eq("id", true);
  if (error) throw new Error(`Actualizando config_sitio: ${error.message}`);
  console.log("  config_sitio actualizada." + (fondoLoginUrl ? ` Fondo de login: ${fondoLoginUrl}` : ""));
}

async function main() {
  console.log("Backfill Blob -> Supabase — proyecto:", SUPABASE_URL);
  await chequeoIdempotencia();
  await migrarCatalogoEHistorial();
  await migrarColecciones();
  await migrarGuiaTallas();
  await migrarConfigSitio();
  console.log("\nListo. Los datos ya están en Supabase — lib/blob.ts todavía sigue leyendo de Vercel Blob (eso es la Fase 1), así que el sitio en producción no cambió de comportamiento todavía.");
}

main().catch((err) => {
  console.error("\nFalló el backfill:", err);
  process.exit(1);
});
