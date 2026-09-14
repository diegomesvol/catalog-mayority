"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { fetchJson } from "@/lib/apiCliente";
import { formatearPrecio } from "@/lib/format";
import type { ItemCarrito } from "@/lib/carrito";

type Estado = "pendiente" | "confirmado" | "despachado" | "cancelado";

interface Pedido {
  id: string;
  items: ItemCarrito[];
  total: number;
  estado: Estado;
  notas_admin: string | null;
  creado_en: string;
  cliente: { nombre: string; empresa: string; telefono: string; email: string } | null;
}

const ESTADOS: Estado[] = ["pendiente", "confirmado", "despachado", "cancelado"];

const ESTADO_ETIQUETA: Record<Estado, string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  despachado: "Despachado",
  cancelado: "Cancelado",
};

function formatearFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-VE", { day: "2-digit", month: "short", year: "numeric" });
}

// Lista de todos los pedidos (de todos los clientes) con seguimiento de
// estado + notas — cada fila guarda solo cuando se toca "Guardar" (no en
// cada tecla), para no mandar un PATCH por cada carácter escrito en notas.
export function PedidosAdmin() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [cargando, setCargando] = useState(true);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Record<string, { estado: Estado; notas: string }>>({});
  const [guardandoId, setGuardandoId] = useState<string | null>(null);

  // mostrarCargando=false en el efecto de montaje — ver la misma nota en
  // ClientesAdmin.cargar (evita el warning "set-state-in-effect").
  async function cargar(mostrarCargando = true) {
    if (mostrarCargando) setCargando(true);
    try {
      const { resp, data } = await fetchJson<{ ok: boolean; pedidos?: Pedido[]; mensaje?: string }>("/api/admin/pedidos");
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
    // Ver la nota equivalente en ClientesAdmin — difiere la llamada un
    // microtask para evitar el warning set-state-in-effect.
    async function iniciar() {
      await Promise.resolve();
      await cargar(false);
    }
    iniciar();
  }, []);

  function empezarEdicion(p: Pedido) {
    setBorrador({ ...borrador, [p.id]: { estado: p.estado, notas: p.notas_admin ?? "" } });
    setExpandido(expandido === p.id ? null : p.id);
  }

  async function guardar(id: string) {
    const cambios = borrador[id];
    if (!cambios) return;
    setGuardandoId(id);
    try {
      const { resp, data } = await fetchJson<{ ok: boolean; pedido?: Pedido; mensaje?: string }>(`/api/admin/pedidos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: cambios.estado, notasAdmin: cambios.notas.trim() || undefined }),
      });
      if (!resp.ok || !data?.ok) {
        toast.error(data?.mensaje ?? "No se pudo actualizar el pedido.");
        return;
      }
      toast.success("Pedido actualizado.");
      setExpandido(null);
      await cargar();
    } catch (err) {
      logError("PedidosAdmin.guardar", err, "No se pudo conectar con el servidor — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setGuardandoId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-ink-200 p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-ink-900">Pedidos</h2>
      <p className="mt-1 text-xs text-ink-500">Pedidos guardados por clientes con cuenta propia — seguimiento de estado.</p>

      {cargando ? (
        <div className="mt-4 space-y-2" aria-label="Cargando pedidos" role="status">
          <div className="skeleton h-14 rounded-lg" />
          <div className="skeleton h-14 rounded-lg" />
        </div>
      ) : pedidos.length === 0 ? (
        <p className="mt-4 text-xs text-ink-500">Todavía no hay pedidos registrados.</p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-ink-200">
          {pedidos.map((p) => {
            const abierto = expandido === p.id;
            const edicion = borrador[p.id];
            return (
              <li key={p.id} className="py-3">
                <button type="button" onClick={() => empezarEdicion(p)} className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-1 text-left text-sm">
                  <div className="flex flex-col">
                    <span className="text-ink-900">{p.cliente ? `${p.cliente.nombre} — ${p.cliente.empresa}` : "Cliente eliminado"}</span>
                    <span className="text-xs text-ink-500">
                      {formatearFecha(p.creado_en)} · {p.items.length} producto{p.items.length === 1 ? "" : "s"} · {formatearPrecio(p.total)}
                    </span>
                  </div>
                  <span className="shrink-0 rounded-full border border-ink-200 px-2.5 py-0.5 text-xs font-medium text-ink-700">
                    {ESTADO_ETIQUETA[p.estado]}
                  </span>
                </button>

                {abierto && edicion && (
                  <div className="mt-3 flex flex-col gap-3 rounded-xl bg-paper p-3">
                    <div>
                      <label htmlFor={`estado-${p.id}`} className="mb-1 block text-xs font-medium text-ink-900">
                        Estado
                      </label>
                      <select
                        id={`estado-${p.id}`}
                        value={edicion.estado}
                        onChange={(e) => setBorrador({ ...borrador, [p.id]: { ...edicion, estado: e.target.value as Estado } })}
                        className="w-full rounded-lg border border-ink-200 bg-paper-raised px-3 py-2 text-sm text-ink-900 focus:border-accent-600"
                      >
                        {ESTADOS.map((e) => (
                          <option key={e} value={e}>
                            {ESTADO_ETIQUETA[e]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor={`notas-${p.id}`} className="mb-1 block text-xs font-medium text-ink-900">
                        Notas (visibles para el cliente)
                      </label>
                      <textarea
                        id={`notas-${p.id}`}
                        value={edicion.notas}
                        onChange={(e) => setBorrador({ ...borrador, [p.id]: { ...edicion, notas: e.target.value } })}
                        rows={2}
                        maxLength={500}
                        className="w-full resize-none rounded-lg border border-ink-200 bg-paper-raised px-3 py-2 text-sm text-ink-900 focus:border-accent-600"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => guardar(p.id)}
                        disabled={guardandoId === p.id}
                        className="rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {guardandoId === p.id ? "Guardando…" : "Guardar"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandido(null)}
                        disabled={guardandoId === p.id}
                        className="rounded-full px-4 py-2 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
