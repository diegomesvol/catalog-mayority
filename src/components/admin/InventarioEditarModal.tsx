"use client";

import { useEffect, useId, useState } from "react";
import { toast } from "sonner";
import type { ProductoInventario, TallaInventario } from "@/lib/blob";
import { UMBRAL_STOCK_DEFECTO } from "@/lib/inventario";
import { fetchJson } from "@/lib/apiCliente";
import { logError } from "@/lib/logger";
import { useBloqueoScroll } from "@/hooks/useBloqueoScroll";

interface CambioTalla {
  tallaId: string;
  disponible: number;
  disponibleFisico: number;
}

interface Props {
  producto: ProductoInventario;
  umbralActual: number;
  onCerrar: () => void;
  onGuardado: (cambios: CambioTalla[], nuevoUmbral: number) => void;
}

// Modal de edición rápida — a nivel de TALLA (color+curva+talla), fiel al
// modelo real de datos: el stock vive ahí, no hay un "stock total" editable
// como campo propio (ver stockTotalProducto en lib/producto.ts, que es una
// SUMA derivada). Solo se edita "disponible" por fila — disponibleFisico se
// recalcula solo como min(físico actual, nuevo disponible) para no exigir
// dos números por talla en una edición que se quiere rápida; la API igual
// valida el par completo (ver lib/schemas/inventario.ts).
export function InventarioEditarModal({ producto, umbralActual, onCerrar, onGuardado }: Props) {
  const idTitulo = useId();
  useBloqueoScroll(true);

  const [valores, setValores] = useState<Record<string, number>>(() => {
    const inicial: Record<string, number> = {};
    for (const color of producto.colores) {
      for (const curva of color.curvas) {
        for (const t of curva.tallas) inicial[t.id] = t.disponible;
      }
    }
    return inicial;
  });
  const [umbral, setUmbral] = useState(umbralActual);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onCerrar]);

  function setValor(tallaId: string, texto: string) {
    const n = Number(texto);
    setValores((v) => ({ ...v, [tallaId]: texto === "" || !Number.isFinite(n) || n < 0 ? 0 : Math.trunc(n) }));
  }

  async function guardar() {
    setGuardando(true);
    try {
      const cambios: { talla: TallaInventario; nuevoValor: number }[] = [];
      for (const color of producto.colores) {
        for (const curva of color.curvas) {
          for (const t of curva.tallas) {
            if (valores[t.id] !== t.disponible) cambios.push({ talla: t, nuevoValor: valores[t.id] });
          }
        }
      }
      const umbralCambio = umbral !== umbralActual;

      if (cambios.length === 0 && !umbralCambio) {
        onCerrar();
        return;
      }

      const resultados = await Promise.all([
        ...cambios.map(({ talla, nuevoValor }) =>
          fetchJson<{ ok: boolean; mensaje?: string }>(`/api/admin/inventario/talla/${talla.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ disponible: nuevoValor, disponibleFisico: Math.min(talla.disponibleFisico, nuevoValor) }),
          }),
        ),
        ...(umbralCambio
          ? [
              fetchJson<{ ok: boolean; mensaje?: string }>("/api/admin/inventario/umbrales", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slug: producto.id, umbral }),
              }),
            ]
          : []),
      ]);

      const fallo = resultados.find((r) => !r.resp.ok || !r.data?.ok);
      if (fallo) {
        toast.error(fallo.data?.mensaje ?? "No se pudieron guardar todos los cambios.");
        return;
      }

      onGuardado(
        cambios.map(({ talla, nuevoValor }) => ({
          tallaId: talla.id,
          disponible: nuevoValor,
          disponibleFisico: Math.min(talla.disponibleFisico, nuevoValor),
        })),
        umbral,
      );
      toast.success("Stock actualizado.");
      onCerrar();
    } catch (err) {
      logError("InventarioEditarModal.guardar", err, "No se pudo conectar con el servidor — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4" onClick={onCerrar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-paper-raised shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-ink-200 p-4">
          <div>
            <h2 id={idTitulo} className="text-sm font-semibold text-ink-900">
              Editar stock — {producto.modelo}
            </h2>
            <p className="mt-0.5 text-xs text-ink-500">
              {producto.marca} · {producto.genero}
              {producto.linea ? ` · ${producto.linea}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar"
            className="shrink-0 rounded-full p-1.5 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-4">
            <label htmlFor={`${idTitulo}-umbral`} className="mb-1 block text-xs font-medium text-ink-500">
              Umbral de "bajo stock" para este producto
            </label>
            <input
              id={`${idTitulo}-umbral`}
              type="number"
              inputMode="numeric"
              min={0}
              value={umbral}
              onChange={(e) => setUmbral(Math.max(0, Math.trunc(Number(e.target.value) || 0)))}
              className="w-32 rounded-lg border border-ink-200 bg-paper px-3 py-2 text-sm focus:border-accent-600"
            />
            <p className="mt-1 text-[11px] text-ink-500">
              Por defecto {UMBRAL_STOCK_DEFECTO} unidades. Por debajo de este número (y mayor a 0) se muestra "Bajo stock".
            </p>
          </div>

          <div className="flex flex-col divide-y divide-ink-200 border-t border-ink-200">
            {producto.colores.map((color) =>
              color.curvas.map((curva) =>
                curva.tallas.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-900">
                        {color.color} · {curva.rango} · talla {t.talla}
                      </p>
                      <p className="truncate text-xs text-ink-500">SKU {curva.codigoSap}</p>
                    </div>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={valores[t.id]}
                      onChange={(e) => setValor(t.id, e.target.value)}
                      aria-label={`Stock disponible de ${color.color} ${curva.rango} talla ${t.talla}`}
                      className="w-24 shrink-0 rounded-lg border border-ink-200 bg-paper px-3 py-1.5 text-sm focus:border-accent-600"
                    />
                  </div>
                )),
              ),
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-ink-200 p-4">
          <button
            type="button"
            onClick={onCerrar}
            disabled={guardando}
            className="rounded-full px-4 py-2 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
