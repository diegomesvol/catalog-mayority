"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { ProductoInventario } from "@/lib/blob";
import { estadoStockProducto, umbralProducto, type EstadoStock } from "@/lib/inventario";
import { stockTotalProducto, tallasDelProducto } from "@/lib/producto";
import { exportarInventarioExcel } from "@/lib/inventarioExportar";
import { fetchJson } from "@/lib/apiCliente";
import { logError } from "@/lib/logger";
import { InventarioFiltrosBarra } from "./InventarioFiltrosBarra";
import { InventarioBulkBarra } from "./InventarioBulkBarra";
import { InventarioTabla, type ColumnaOrdenInventario, type DireccionOrden, type FilaInventario } from "./InventarioTabla";
import { InventarioEditarModal } from "./InventarioEditarModal";

// Panel de Gestión de Inventario (/admin/inventario) — diseño inspirado en
// la estética de HeroUI (tabla con bordes limpios, hover, checkboxes,
// avatares, badges pill, paginado con selector de filas) pero construido
// con Tailwind + los tokens que ya tiene este proyecto (success/warning/
// danger/info en globals.css), no con la librería @heroui/react en sí:
// HeroUI hoy apunta a Tailwind v3 y necesita framer-motion + su propio
// ThemeProvider, y esta sesión no tiene forma de correr `npm install` para
// confirmar que conviva bien con el Tailwind v4 de este proyecto antes de
// que Diego lo compile — decisión tomada con él explícitamente.
//
// Todo el filtrado/orden/paginado es sobre datos ya cargados en el cliente
// (mismo criterio que CatalogoClient.tsx del catálogo público) — el
// catálogo completo se lee una sola vez del lado del servidor (ver
// app/admin/inventario/page.tsx) y viaja acá como prop.
const TAMANOS_PAGINA = [10, 20, 50, 100] as const;

interface Props {
  productosIniciales: ProductoInventario[];
  umbralesIniciales: Record<string, number>;
}

function coincideBusqueda(producto: ProductoInventario, texto: string): boolean {
  if (!texto) return true;
  const codigosSap = producto.colores.flatMap((c) => c.curvas.map((cur) => cur.codigoSap));
  const campo = `${producto.modelo} ${producto.marca} ${producto.rubro} ${producto.codigoModelo ?? ""} ${codigosSap.join(" ")}`.toLowerCase();
  return campo.includes(texto.toLowerCase());
}

function primeraFoto(producto: ProductoInventario): string | undefined {
  for (const color of producto.colores) {
    if (color.fotos[0]) return color.fotos[0];
  }
  return undefined;
}

export function InventarioAdmin({ productosIniciales, umbralesIniciales }: Props) {
  const [productos, setProductos] = useState(productosIniciales);
  const [umbrales, setUmbrales] = useState(umbralesIniciales);

  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoStock | "">("");
  const [marcaFiltro, setMarcaFiltro] = useState("");
  const [lineaFiltro, setLineaFiltro] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [orden, setOrden] = useState<{ columna: ColumnaOrdenInventario; direccion: DireccionOrden }>({
    columna: "nombre",
    direccion: "asc",
  });
  const [pagina, setPagina] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState<number>(20);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [productoEditando, setProductoEditando] = useState<ProductoInventario | null>(null);
  const [agotandoMasivo, setAgotandoMasivo] = useState(false);

  const marcas = useMemo(() => Array.from(new Set(productos.map((p) => p.marca))).sort((a, b) => a.localeCompare(b, "es")), [productos]);
  const lineas = useMemo(
    () => Array.from(new Set(productos.map((p) => p.linea).filter((v): v is string => Boolean(v)))).sort((a, b) => a.localeCompare(b, "es")),
    [productos],
  );
  const categorias = useMemo(() => Array.from(new Set(productos.map((p) => p.rubro))).sort((a, b) => a.localeCompare(b, "es")), [productos]);

  const filas: FilaInventario[] = useMemo(() => {
    return productos
      .filter((p) => coincideBusqueda(p, busqueda))
      .filter((p) => !marcaFiltro || p.marca === marcaFiltro)
      .filter((p) => !lineaFiltro || p.linea === lineaFiltro)
      .filter((p) => !categoriaFiltro || p.rubro === categoriaFiltro)
      .map((producto) => {
        const precios = producto.colores.map((c) => c.precio);
        return {
          producto,
          estado: estadoStockProducto(producto, umbrales),
          stockTotal: stockTotalProducto(producto),
          precioDesde: precios.length > 0 ? Math.min(...precios) : 0,
          fotoUrl: primeraFoto(producto),
          coloresTexto: producto.colores.map((c) => c.color).join(", "),
          tallasTexto: tallasDelProducto(producto).join(", "),
        };
      })
      .filter((f) => !estadoFiltro || f.estado === estadoFiltro);
  }, [productos, umbrales, busqueda, marcaFiltro, lineaFiltro, categoriaFiltro, estadoFiltro]);

  const filasOrdenadas = useMemo(() => {
    const copia = [...filas];
    const signo = orden.direccion === "asc" ? 1 : -1;
    copia.sort((a, b) => {
      if (orden.columna === "nombre") return signo * a.producto.modelo.localeCompare(b.producto.modelo, "es");
      if (orden.columna === "precio") return signo * (a.precioDesde - b.precioDesde);
      return signo * (a.stockTotal - b.stockTotal);
    });
    return copia;
  }, [filas, orden]);

  const totalPaginas = Math.max(1, Math.ceil(filasOrdenadas.length / filasPorPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const filasPaginadas = useMemo(
    () => filasOrdenadas.slice((paginaActual - 1) * filasPorPagina, paginaActual * filasPorPagina),
    [filasOrdenadas, paginaActual, filasPorPagina],
  );

  function cambiarOrden(columna: ColumnaOrdenInventario) {
    setOrden((o) => (o.columna === columna ? { columna, direccion: o.direccion === "asc" ? "desc" : "asc" } : { columna, direccion: "asc" }));
  }

  function reiniciarPagina() {
    setPagina(1);
  }

  // "Seleccionar todos" actúa sobre la página visible, no sobre las
  // ~cientos de filas que puede haber filtradas — mismo criterio que un
  // checkbox de encabezado siempre representa "lo que se está mirando".
  function toggleTodos() {
    setSeleccionados((prev) => {
      const idsPagina = filasPaginadas.map((f) => f.producto.id);
      const todosActivos = idsPagina.every((id) => prev.has(id));
      const siguiente = new Set(prev);
      for (const id of idsPagina) (todosActivos ? siguiente.delete(id) : siguiente.add(id));
      return siguiente;
    });
  }

  function toggleFila(slug: string) {
    setSeleccionados((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(slug)) siguiente.delete(slug);
      else siguiente.add(slug);
      return siguiente;
    });
  }

  function guardarEdicion(slug: string, cambios: { tallaId: string; disponible: number; disponibleFisico: number }[], nuevoUmbral: number) {
    setProductos((prev) =>
      prev.map((p) => {
        if (p.id !== slug) return p;
        return {
          ...p,
          colores: p.colores.map((c) => ({
            ...c,
            curvas: c.curvas.map((curva) => ({
              ...curva,
              tallas: curva.tallas.map((t) => {
                const cambio = cambios.find((x) => x.tallaId === t.id);
                return cambio ? { ...t, disponible: cambio.disponible, disponibleFisico: cambio.disponibleFisico } : t;
              }),
            })),
          })),
        };
      }),
    );
    setUmbrales((prev) => ({ ...prev, [slug]: nuevoUmbral }));
  }

  async function agotarSeleccionados() {
    const productosSeleccionados = productos.filter((p) => seleccionados.has(p.id));
    const tallaIds = productosSeleccionados.flatMap((p) => p.colores.flatMap((c) => c.curvas.flatMap((cur) => cur.tallas.map((t) => t.id))));
    if (tallaIds.length === 0) return;

    setAgotandoMasivo(true);
    try {
      const { resp, data } = await fetchJson<{ ok: boolean; mensaje?: string }>("/api/admin/inventario/agotar-masivo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tallaIds }),
      });
      if (!resp.ok || !data?.ok) {
        toast.error(data?.mensaje ?? "No se pudo actualizar el stock de los seleccionados.");
        return;
      }
      const idsAgotados = new Set(tallaIds);
      setProductos((prev) =>
        prev.map((p) =>
          seleccionados.has(p.id)
            ? {
                ...p,
                colores: p.colores.map((c) => ({
                  ...c,
                  curvas: c.curvas.map((curva) => ({
                    ...curva,
                    tallas: curva.tallas.map((t) => (idsAgotados.has(t.id) ? { ...t, disponible: 0, disponibleFisico: 0 } : t)),
                  })),
                })),
              }
            : p,
        ),
      );
      toast.success(`${productosSeleccionados.length} producto${productosSeleccionados.length === 1 ? "" : "s"} marcado${productosSeleccionados.length === 1 ? "" : "s"} como agotado.`);
      setSeleccionados(new Set());
    } catch (err) {
      logError("InventarioAdmin.agotarSeleccionados", err, "No se pudo conectar con el servidor — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setAgotandoMasivo(false);
    }
  }

  function exportarTodo() {
    exportarInventarioExcel(filasOrdenadas.map((f) => f.producto), umbrales, "inventario.xlsx");
  }

  function exportarSeleccion() {
    exportarInventarioExcel(
      productos.filter((p) => seleccionados.has(p.id)),
      umbrales,
      "inventario-seleccion.xlsx",
    );
  }

  return (
    // "min-w-0": mismo motivo que en InventarioFiltrosBarra.tsx — este es un
    // flex item de la columna que arma page.tsx/AdminHeader, y sin esto un
    // hijo ancho (la tabla, un <select> con opción larga) puede empujarlo
    // más ancho que la pantalla en vez de scrollear solo puntualmente.
    <div className="flex min-w-0 flex-col gap-5">
      <InventarioFiltrosBarra
        busqueda={busqueda}
        onBusqueda={(v) => {
          setBusqueda(v);
          reiniciarPagina();
        }}
        estado={estadoFiltro}
        onEstado={(v) => {
          setEstadoFiltro(v);
          reiniciarPagina();
        }}
        marca={marcaFiltro}
        onMarca={(v) => {
          setMarcaFiltro(v);
          reiniciarPagina();
        }}
        marcas={marcas}
        linea={lineaFiltro}
        onLinea={(v) => {
          setLineaFiltro(v);
          reiniciarPagina();
        }}
        lineas={lineas}
        categoria={categoriaFiltro}
        onCategoria={(v) => {
          setCategoriaFiltro(v);
          reiniciarPagina();
        }}
        categorias={categorias}
        onExportarTodo={exportarTodo}
      />

      <InventarioBulkBarra
        cantidad={seleccionados.size}
        agotando={agotandoMasivo}
        onAgotar={agotarSeleccionados}
        onExportar={exportarSeleccion}
        onCancelar={() => setSeleccionados(new Set())}
      />

      {filasOrdenadas.length === 0 ? (
        <p className="rounded-xl border border-ink-200 bg-paper-raised p-6 text-center text-sm text-ink-500">
          Ningún producto coincide con la búsqueda o los filtros actuales.
        </p>
      ) : (
        <>
          <InventarioTabla
            filas={filasPaginadas}
            seleccionados={seleccionados}
            todosSeleccionados={filasPaginadas.length > 0 && filasPaginadas.every((f) => seleccionados.has(f.producto.id))}
            orden={orden}
            onToggleFila={toggleFila}
            onToggleTodos={toggleTodos}
            onOrdenar={cambiarOrden}
            onEditar={setProductoEditando}
          />

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink-500">
            <div className="flex items-center gap-2">
              <span>Filas por página</span>
              <select
                value={filasPorPagina}
                onChange={(e) => {
                  setFilasPorPagina(Number(e.target.value));
                  reiniciarPagina();
                }}
                className="rounded-lg border border-ink-200 bg-paper-raised px-2 py-1 text-xs text-ink-900 focus:border-accent-600"
              >
                {TAMANOS_PAGINA.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span>· {filasOrdenadas.length} productos en total</span>
            </div>

            {totalPaginas > 1 && (
              <nav className="flex items-center gap-3" aria-label="Paginado del inventario">
                <button
                  type="button"
                  disabled={paginaActual <= 1}
                  onClick={() => setPagina(paginaActual - 1)}
                  className="rounded-full border border-ink-200 px-3 py-1.5 font-medium text-ink-900 transition-colors hover:border-ink-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Anterior
                </button>
                <span>
                  {paginaActual} / {totalPaginas}
                </span>
                <button
                  type="button"
                  disabled={paginaActual >= totalPaginas}
                  onClick={() => setPagina(paginaActual + 1)}
                  className="rounded-full border border-ink-200 px-3 py-1.5 font-medium text-ink-900 transition-colors hover:border-ink-900 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Siguiente
                </button>
              </nav>
            )}
          </div>
        </>
      )}

      {productoEditando && (
        <InventarioEditarModal
          producto={productoEditando}
          umbralActual={umbralProducto(productoEditando.id, umbrales)}
          onCerrar={() => setProductoEditando(null)}
          onGuardado={(cambios, nuevoUmbral) => guardarEdicion(productoEditando.id, cambios, nuevoUmbral)}
        />
      )}
    </div>
  );
}
