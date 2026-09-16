"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Producto } from "@/lib/types";
import { Filtros, FILTROS_VACIOS, filtrosDesdeParams, paramsDesdeFiltros, type ValorFiltros } from "./Filtros";
import { OrdenSelector } from "./OrdenSelector";
import { useBusqueda } from "./BusquedaContext";
import { ProductGrid } from "./ProductGrid";
import { EstadoVacio } from "./EstadoVacio";
import { tieneStockProducto, tallasDelProducto, ordenarProductos, type OrdenCatalogo } from "@/lib/producto";
import { leerFiltrosGuardados, guardarFiltros } from "@/lib/filtrosCatalogoLocal";

const POR_PAGINA = 100;

type CampoFiltro = keyof ValorFiltros;

// Único lugar con la lógica de "¿este producto pasa los filtros?" — la usan
// tanto el listado final (sin omitir nada) como el cálculo de qué opciones
// mostrar en cada Select (omitiendo el propio campo del Select, para saber
// qué marcas/colores/etc. existen dado el RESTO de los filtros activos).
// Un producto ahora agrupa varios colores/curvas (ver lib/producto.ts) — los
// filtros por color/precio/talla/stock pasan por "¿ALGÚN color/curva del
// producto cumple esto?", no por un único valor plano como antes.
function coincideConFiltros(p: Producto, filtros: ValorFiltros, omitir?: CampoFiltro): boolean {
  const busqueda = filtros.busqueda.trim().toLowerCase();
  if (busqueda) {
    // Busca en modelo, marca, código de modelo, y color/código SAP de CADA
    // color y curva — así un comprador encuentra el producto tipeando
    // cualquiera de esos datos, sin importar en qué color/curva estén.
    const camposPorColor = p.colores.flatMap((c) => [c.color, ...c.curvas.map((cur) => cur.codigoSap)]);
    const campoBusqueda = `${p.modelo} ${p.marca} ${p.codigoModelo ?? ""} ${camposPorColor.join(" ")}`.toLowerCase();
    if (!campoBusqueda.includes(busqueda)) return false;
  }
  // Marca/Género/Color/Línea: selección múltiple — el producto entra si
  // coincide con ALGUNO de los valores elegidos en cada filtro (OR dentro
  // del mismo campo), y deben cumplirse TODOS los campos activos entre sí
  // (AND entre campos distintos) — mismo criterio de faceted-filter de
  // siempre, solo que ahora cada campo admite más de un valor.
  if (omitir !== "marca" && filtros.marca.length > 0 && !filtros.marca.includes(p.marca)) return false;
  if (omitir !== "genero" && filtros.genero.length > 0 && !filtros.genero.includes(p.genero)) return false;
  if (omitir !== "color" && filtros.color.length > 0 && !p.colores.some((c) => filtros.color.includes(c.color))) return false;
  if (omitir !== "categoria" && filtros.categoria.length > 0 && !filtros.categoria.includes(p.rubro)) return false;
  if (omitir !== "linea" && filtros.linea.length > 0 && !(p.linea && filtros.linea.includes(p.linea))) return false;
  if (omitir !== "tallas" && filtros.tallas.length > 0) {
    const tallasProducto = tallasDelProducto(p);
    if (!filtros.tallas.some((t) => tallasProducto.includes(t))) return false;
  }
  if (omitir !== "soloDisponibles" && filtros.soloDisponibles && !tieneStockProducto(p)) return false;
  return true;
}

// Opciones de un Select "contextuales": solo las que realmente existen entre
// los productos que cumplen el RESTO de los filtros activos (sin contar el
// propio campo). Así, si ya elegiste Marca "Volpe", el Select de Color deja
// de mostrar colores que Volpe no tiene — en vez de dejarlos ahí y que el
// comprador elija una combinación que da 0 resultados sin entender por qué.
// El valor ya elegido se mantiene siempre en la lista, aunque haya quedado
// sin productos por otro filtro más nuevo, para no perder de vista qué
// estaba seleccionado. "extraer" devuelve una LISTA (no un solo valor) para
// poder cubrir el caso de Color, donde un mismo producto aporta varios.
function opcionesContextuales(
  productos: Producto[],
  filtros: ValorFiltros,
  campo: CampoFiltro,
  extraer: (p: Producto) => (string | undefined)[],
  valorActual: string[],
): string[] {
  const conjunto = new Set(
    productos
      .filter((p) => coincideConFiltros(p, filtros, campo))
      .flatMap(extraer)
      .filter((v): v is string => Boolean(v)),
  );
  for (const v of valorActual) conjunto.add(v);
  return Array.from(conjunto).sort((a, b) => a.localeCompare(b, "es"));
}

export function CatalogoClient({ productos }: { productos: Producto[] }) {
  // Se leen una sola vez, al montar, para inicializar el estado — así el
  // catálogo arranca mostrando exactamente lo que decía la URL (por ejemplo,
  // al volver desde un producto o al abrir un link compartido ya filtrado).
  const searchParamsIniciales = useSearchParams();
  const [filtros, setFiltros] = useState<ValorFiltros>(() => {
    const desdeUrl = filtrosDesdeParams(searchParamsIniciales);
    const hayFiltroEnUrl =
      desdeUrl.marca.length > 0 ||
      desdeUrl.genero.length > 0 ||
      desdeUrl.color.length > 0 ||
      desdeUrl.categoria.length > 0 ||
      desdeUrl.linea.length > 0 ||
      desdeUrl.tallas.length > 0 ||
      desdeUrl.soloDisponibles ||
      Boolean(desdeUrl.orden);
    // Un link compartido (o volver desde un producto) siempre gana sobre lo
    // guardado en este navegador — solo se recurre a localStorage cuando la
    // URL no trae NINGÚN filtro/orden propio, para restaurar la última
    // búsqueda entre visitas (ver lib/filtrosCatalogoLocal.ts).
    if (hayFiltroEnUrl) return desdeUrl;
    const guardados = leerFiltrosGuardados();
    if (!guardados) return desdeUrl;
    // "categoria" era un único string antes de unificar los 5 filtros como
    // arrays — un navegador con localStorage viejo (de antes de este
    // cambio) puede traer ese shape guardado; se normaliza acá para no
    // romper .length/.includes de golpe en el resto del componente.
    const categoriaGuardada = Array.isArray(guardados.categoria)
      ? guardados.categoria
      : guardados.categoria
        ? [guardados.categoria as unknown as string]
        : [];
    return { ...FILTROS_VACIOS, ...guardados, categoria: categoriaGuardada };
  });
  const [pagina, setPagina] = useState(() => {
    const p = Number(searchParamsIniciales.get("pagina"));
    return Number.isFinite(p) && p > 0 ? p : 1;
  });

  // El texto de búsqueda ya no vive acá: el input se mudó al navbar
  // (BuscadorNavbar), visible en cualquier parte del scroll, no solo arriba
  // del catálogo — BusquedaContext es el punto compartido entre ambos. El
  // resto de los filtros (marca, color, talla, etc.) sigue como antes.
  const { busqueda, setBusqueda, setModoVivo } = useBusqueda();
  const filtrosCombinados = useMemo<ValorFiltros>(() => ({ ...filtros, busqueda }), [filtros, busqueda]);

  // Le avisa a BuscadorNavbar (vía BusquedaContext) que la grilla está
  // montada y filtrando en vivo — ver la nota en BusquedaContext.tsx. Si
  // page.tsx está mostrando el landing de colecciones en su lugar, este
  // efecto nunca corre y el navbar sabe que no puede filtrar en vivo.
  useEffect(() => {
    setModoVivo(true);
    return () => setModoVivo(false);
  }, [setModoVivo]);

  // Cada Select recibe solo las opciones que existen dado el resto de los
  // filtros ya activos (ver opcionesContextuales) — es lo que hace que,
  // visualmente, "desaparezcan" categorías sin resultado en vez de quedar
  // ahí invitando a una combinación vacía. El orden de "productos" (prop)
  // acá no importa — filtrar es una operación sin orden; el orden final que
  // ve el comprador se aplica una sola vez, al final, sobre "filtrados"
  // (ver ordenarProductos más abajo).
  const marcas = useMemo(
    () => opcionesContextuales(productos, filtrosCombinados, "marca", (p) => [p.marca], filtrosCombinados.marca),
    [productos, filtrosCombinados],
  );
  const generos = useMemo(
    () => opcionesContextuales(productos, filtrosCombinados, "genero", (p) => [p.genero], filtrosCombinados.genero),
    [productos, filtrosCombinados],
  );
  const colores = useMemo(
    () =>
      opcionesContextuales(
        productos,
        filtrosCombinados,
        "color",
        (p) => p.colores.map((c) => c.color),
        filtrosCombinados.color,
      ),
    [productos, filtrosCombinados],
  );
  const categorias = useMemo(
    () => opcionesContextuales(productos, filtrosCombinados, "categoria", (p) => [p.rubro], filtrosCombinados.categoria),
    [productos, filtrosCombinados],
  );
  const lineas = useMemo(
    () => opcionesContextuales(productos, filtrosCombinados, "linea", (p) => [p.linea], filtrosCombinados.linea),
    [productos, filtrosCombinados],
  );
  const tallas = useMemo(() => {
    const conjunto = new Set(
      productos.filter((p) => coincideConFiltros(p, filtrosCombinados, "tallas")).flatMap((p) => tallasDelProducto(p)),
    );
    for (const t of filtrosCombinados.tallas) conjunto.add(t);
    return Array.from(conjunto).sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
  }, [productos, filtrosCombinados]);

  const filtrados = useMemo(
    () => productos.filter((p) => coincideConFiltros(p, filtrosCombinados)),
    [productos, filtrosCombinados],
  );

  // Único lugar donde el orden elegido por el comprador (o el curado por
  // defecto) se aplica de verdad — ver ordenarProductos en lib/producto.ts.
  const filtradosOrdenados = useMemo(
    () => ordenarProductos(filtrados, filtrosCombinados.orden),
    [filtrados, filtrosCombinados.orden],
  );

  const totalPaginas = Math.max(1, Math.ceil(filtradosOrdenados.length / POR_PAGINA));
  const paginaActual = Math.min(pagina, totalPaginas);
  const paginados = useMemo(
    () => filtradosOrdenados.slice((paginaActual - 1) * POR_PAGINA, paginaActual * POR_PAGINA),
    [filtradosOrdenados, paginaActual],
  );

  // Mantiene la URL sincronizada con los filtros y la página activos, sin
  // pasar por el router de Next (evita recargar datos del servidor en cada
  // tecla). replaceState para no llenar el historial con una entrada por
  // cada cambio de filtro.
  useEffect(() => {
    const qs = paramsDesdeFiltros(filtrosCombinados, paginaActual).toString();
    const url = qs ? `/?${qs}` : "/";
    window.history.replaceState(null, "", url);
  }, [filtrosCombinados, paginaActual]);

  // Espejo en localStorage de los mismos filtros/orden — ver la nota grande
  // en lib/filtrosCatalogoLocal.ts (por qué existe además de la URL, y qué
  // NO cubre: el landing de colecciones).
  useEffect(() => {
    guardarFiltros(filtrosCombinados);
  }, [filtrosCombinados]);

  // Href al que vuelve cada tarjeta de producto — el catálogo completo con
  // los filtros y la página actuales, para que "Volver al catálogo" no
  // arranque de cero.
  const volver = useMemo(() => {
    const qs = paramsDesdeFiltros(filtrosCombinados, paginaActual).toString();
    return qs ? `/?${qs}` : "/";
  }, [filtrosCombinados, paginaActual]);

  // v.busqueda llega desde el chip "Buscar: …" de Filtros (su única forma de
  // tocar la búsqueda ahora que el input se mudó al navbar) — se reenvía a
  // BusquedaContext para que quede en el mismo lugar que si se hubiera
  // borrado desde ahí.
  function cambiarFiltros(v: ValorFiltros) {
    setBusqueda(v.busqueda);
    setFiltros(v);
    setPagina(1);
  }

  // Separado de cambiarFiltros: el orden no toca busqueda/BusquedaContext,
  // solo reordena lo ya filtrado — pero sí vuelve a página 1, porque el
  // contenido de cada página cambia por completo.
  function cambiarOrden(orden: OrdenCatalogo) {
    setFiltros((f) => ({ ...f, orden }));
    setPagina(1);
  }

  function irAPagina(p: number) {
    setPagina(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="flex flex-col gap-5">
      <Filtros
        marcas={marcas}
        generos={generos}
        colores={colores}
        categorias={categorias}
        lineas={lineas}
        tallas={tallas}
        valor={filtrosCombinados}
        onChange={cambiarFiltros}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-ink-500" role="status">
          {filtrados.length} {filtrados.length === 1 ? "producto" : "productos"}
          {totalPaginas > 1 && ` · página ${paginaActual} de ${totalPaginas}`}
        </p>
        {filtrados.length > 0 && <OrdenSelector valor={filtrosCombinados.orden} onChange={cambiarOrden} />}
      </div>

      {filtrados.length === 0 ? (
        <EstadoVacio
          titulo="Sin resultados"
          descripcion="No encontramos productos con esos filtros. Probá ajustar la búsqueda o limpiar los filtros."
          accion={
            <button
              type="button"
              onClick={() => cambiarFiltros(FILTROS_VACIOS)}
              className="rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink-700"
            >
              Limpiar filtros
            </button>
          }
        />
      ) : (
        <>
          <ProductGrid productos={paginados} volver={volver} />

          {totalPaginas > 1 && (
            <nav className="mt-4 flex items-center justify-center gap-3" aria-label="Paginado del catálogo">
              <button
                type="button"
                disabled={paginaActual <= 1}
                onClick={() => irAPagina(paginaActual - 1)}
                className="rounded-full border border-ink-200 px-4 py-2 text-sm font-medium text-ink-900 transition-colors hover:border-ink-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="text-sm text-ink-500">
                {paginaActual} / {totalPaginas}
              </span>
              <button
                type="button"
                disabled={paginaActual >= totalPaginas}
                onClick={() => irAPagina(paginaActual + 1)}
                className="rounded-full border border-ink-200 px-4 py-2 text-sm font-medium text-ink-900 transition-colors hover:border-ink-900 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Siguiente
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
