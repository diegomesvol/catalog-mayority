"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { fetchJson } from "@/lib/apiCliente";
import { exportarPedidosExcel } from "@/lib/pedidosExportar";
import type { DatosComprador, ItemCarrito } from "@/lib/carrito";
import type { EstadoPedido, MetodoEnvio, MetodoPago } from "@/lib/schemas/pedido";
import { PedidosFiltrosBarra } from "./PedidosFiltrosBarra";
import { PedidosBulkBarra } from "./PedidosBulkBarra";
import { PedidosTabla } from "./PedidosTabla";
import { PedidoDetalleModal } from "./PedidoDetalleModal";

// Módulo de Gestión de Pedidos (/admin/pedidos) — mismo diseño (Tailwind +
// tokens del proyecto, "estilo HeroUI" sin instalar la librería) y misma
// arquitectura que el Panel de Inventario: todo el filtrado/orden/paginado
// es sobre los pedidos ya cargados en el cliente (un solo GET a
// /api/admin/pedidos), ver la nota grande en InventarioAdmin.tsx sobre por
// qué. Reemplaza la versión anterior (lista simple expandible por fila).
const TAMANOS_PAGINA = [10, 20, 50] as const;

export interface PedidoFila {
  id: string;
  items: ItemCarrito[];
  comprador: DatosComprador;
  total: number;
  estado: EstadoPedido;
  notas_admin: string | null;
  creado_en: string;
  metodo_pago: MetodoPago | null;
  metodo_envio: MetodoEnvio | null;
  direccion_envio: string | null;
  cliente: {
    nombre: string;
    empresa: string;
    telefono: string;
    email: string;
    rif: string;
    direccion: string | null;
    ciudad: string | null;
    estado_ubicacion: string | null;
    telefono_2: string | null;
  } | null;
}

function coincideBusqueda(p: PedidoFila, texto: string): boolean {
  if (!texto) return true;
  const campo = `${p.id} ${p.comprador.nombre} ${p.comprador.empresa} ${p.comprador.rif} ${p.cliente?.rif ?? ""} ${p.cliente?.email ?? ""}`.toLowerCase();
  return campo.includes(texto.toLowerCase());
}

export function PedidosAdmin() {
  const [pedidos, setPedidos] = useState<PedidoFila[]>([]);
  const [cargando, setCargando] = useState(true);

  const [busqueda, setBusqueda] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoPedido | "">("");
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [pagina, setPagina] = useState(1);
  const [filasPorPagina, setFilasPorPagina] = useState<number>(20);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [pedidoDetalle, setPedidoDetalle] = useState<PedidoFila | null>(null);
  const [cambiandoEstadoId, setCambiandoEstadoId] = useState<string | null>(null);
  const [aplicandoBulk, setAplicandoBulk] = useState(false);

  async function cargar(mostrarCargando = true) {
    if (mostrarCargando) setCargando(true);
    try {
      const { resp, data } = await fetchJson<{ ok: boolean; pedidos?: PedidoFila[]; mensaje?: string }>("/api/admin/pedidos");
      if (!resp.ok || !data?.ok || !data.pedidos) throw new Error(data?.mensaje ?? "No se pudieron leer los pedidos.");
      setPedidos(data.pedidos);
    } catch (err) {
      logError("PedidosAdmin.cargar", err);
      toast.error("No se pudieron cargar los pedidos.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    // Ver la nota equivalente en ClientesAdmin/InventarioAdmin — difiere la
    // llamada un microtask para evitar el warning set-state-in-effect.
    async function iniciar() {
      await Promise.resolve();
      await cargar(false);
    }
    iniciar();
  }, []);

  // Refresco simple (no tiempo real) al volver a la pestaña — mismo patrón
  // que la versión anterior de este componente.
  useEffect(() => {
    function alVolver() {
      if (document.visibilityState === "visible") void cargar(false);
    }
    document.addEventListener("visibilitychange", alVolver);
    return () => document.removeEventListener("visibilitychange", alVolver);
  }, []);

  const filas: PedidoFila[] = useMemo(() => {
    const desdeMs = fechaDesde ? new Date(`${fechaDesde}T00:00:00`).getTime() : null;
    const hastaMs = fechaHasta ? new Date(`${fechaHasta}T23:59:59.999`).getTime() : null;
    return pedidos
      .filter((p) => coincideBusqueda(p, busqueda))
      .filter((p) => !estadoFiltro || p.estado === estadoFiltro)
      .filter((p) => {
        const t = new Date(p.creado_en).getTime();
        if (desdeMs !== null && t < desdeMs) return false;
        if (hastaMs !== null && t > hastaMs) return false;
        return true;
      });
  }, [pedidos, busqueda, estadoFiltro, fechaDesde, fechaHasta]);

  const totalPaginas = Math.max(1, Math.ceil(filas.length / filasPorPagina));
  const paginaActual = Math.min(pagina, totalPaginas);
  const filasPaginadas = useMemo(
    () => filas.slice((paginaActual - 1) * filasPorPagina, paginaActual * filasPorPagina),
    [filas, paginaActual, filasPorPagina],
  );

  function reiniciarPagina() {
    setPagina(1);
  }

  function toggleTodos() {
    setSeleccionados((prev) => {
      const idsPagina = filasPaginadas.map((f) => f.id);
      const todosActivos = idsPagina.every((id) => prev.has(id));
      const siguiente = new Set(prev);
      for (const id of idsPagina) (todosActivos ? siguiente.delete(id) : siguiente.add(id));
      return siguiente;
    });
  }

  function toggleFila(id: string) {
    setSeleccionados((prev) => {
      const siguiente = new Set(prev);
      if (siguiente.has(id)) siguiente.delete(id);
      else siguiente.add(id);
      return siguiente;
    });
  }

  async function cambiarEstadoRapido(id: string, estado: EstadoPedido) {
    setCambiandoEstadoId(id);
    try {
      const { resp, data } = await fetchJson<{ ok: boolean; mensaje?: string }>(`/api/admin/pedidos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
      if (!resp.ok || !data?.ok) {
        toast.error(data?.mensaje ?? "No se pudo actualizar el pedido.");
        return;
      }
      setPedidos((prev) => prev.map((p) => (p.id === id ? { ...p, estado } : p)));
      toast.success("Estado actualizado.");
    } catch (err) {
      logError("PedidosAdmin.cambiarEstadoRapido", err, "No se pudo conectar con el servidor — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setCambiandoEstadoId(null);
    }
  }

  async function cambiarEstadoEnLote(estado: EstadoPedido) {
    const ids = Array.from(seleccionados);
    if (ids.length === 0) return;
    setAplicandoBulk(true);
    try {
      const { resp, data } = await fetchJson<{ ok: boolean; mensaje?: string; actualizados?: number }>("/api/admin/pedidos/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, estado }),
      });
      if (!resp.ok || !data?.ok) {
        toast.error(data?.mensaje ?? "No se pudo actualizar el estado de los pedidos seleccionados.");
        return;
      }
      setPedidos((prev) => prev.map((p) => (seleccionados.has(p.id) ? { ...p, estado } : p)));
      toast.success(`${data.actualizados ?? ids.length} pedido${ids.length === 1 ? "" : "s"} actualizado${ids.length === 1 ? "" : "s"}.`);
      setSeleccionados(new Set());
    } catch (err) {
      logError("PedidosAdmin.cambiarEstadoEnLote", err, "No se pudo conectar con el servidor — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setAplicandoBulk(false);
    }
  }

  function exportarTodo() {
    exportarPedidosExcel(filas, "pedidos.xlsx");
  }

  function exportarSeleccion() {
    exportarPedidosExcel(
      pedidos.filter((p) => seleccionados.has(p.id)),
      "pedidos-seleccion.xlsx",
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <PedidosFiltrosBarra
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
        fechaDesde={fechaDesde}
        onFechaDesde={(v) => {
          setFechaDesde(v);
          reiniciarPagina();
        }}
        fechaHasta={fechaHasta}
        onFechaHasta={(v) => {
          setFechaHasta(v);
          reiniciarPagina();
        }}
        onExportarTodo={exportarTodo}
      />

      <PedidosBulkBarra
        cantidad={seleccionados.size}
        aplicando={aplicandoBulk}
        onCambiarEstado={cambiarEstadoEnLote}
        onExportar={exportarSeleccion}
        onCancelar={() => setSeleccionados(new Set())}
      />

      {cargando ? (
        <div className="flex flex-col gap-2" aria-label="Cargando pedidos" role="status">
          <div className="skeleton h-14 rounded-lg" />
          <div className="skeleton h-14 rounded-lg" />
          <div className="skeleton h-14 rounded-lg" />
        </div>
      ) : filas.length === 0 ? (
        <p className="rounded-xl border border-ink-200 bg-paper-raised p-6 text-center text-sm text-ink-500">
          {pedidos.length === 0 ? "Todavía no hay pedidos registrados." : "Ningún pedido coincide con la búsqueda o los filtros actuales."}
        </p>
      ) : (
        <>
          <PedidosTabla
            filas={filasPaginadas}
            seleccionados={seleccionados}
            todosSeleccionados={filasPaginadas.length > 0 && filasPaginadas.every((f) => seleccionados.has(f.id))}
            cambiandoEstadoId={cambiandoEstadoId}
            onToggleFila={toggleFila}
            onToggleTodos={toggleTodos}
            onVerDetalle={setPedidoDetalle}
            onCambiarEstadoRapido={cambiarEstadoRapido}
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
              <span>· {filas.length} pedidos en total</span>
            </div>

            {totalPaginas > 1 && (
              <nav className="flex items-center gap-3" aria-label="Paginado de pedidos">
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

      {pedidoDetalle && <PedidoDetalleModal pedido={pedidoDetalle} onCerrar={() => setPedidoDetalle(null)} />}
    </div>
  );
}
