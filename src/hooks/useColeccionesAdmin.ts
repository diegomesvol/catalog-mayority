"use client";

import { useState } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { fetchJson } from "@/lib/apiCliente";
import { prepararImagenParaSubir } from "@/lib/imagenCliente";
import type { Coleccion, FiltroColeccion } from "@/lib/types";

function coleccionVacia(): Coleccion {
  return { id: crypto.randomUUID(), nombre: "", imagenUrl: null, filtro: {} };
}

/**
 * Todo el estado y las operaciones de /admin/colecciones (alta, edición,
 * reorden, borrado, subida de portada, guardado) — ColeccionesConfig.tsx
 * solo consume esto y renderiza las tarjetas de vista/edición.
 */
export function useColeccionesAdmin(coleccionesIniciales: Coleccion[]) {
  const [colecciones, setColecciones] = useState<Coleccion[]>(coleccionesIniciales);
  const [guardadas, setGuardadas] = useState<Coleccion[]>(coleccionesIniciales);
  const [idsEnEdicion, setIdsEnEdicion] = useState<Set<string>>(new Set());
  const [subiendoId, setSubiendoId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});

  function actualizar(id: string, cambios: Partial<Coleccion>) {
    setColecciones((prev) => prev.map((c) => (c.id === id ? { ...c, ...cambios } : c)));
  }

  function actualizarFiltro(id: string, campo: keyof FiltroColeccion, valor: string) {
    setColecciones((prev) =>
      prev.map((c) => (c.id === id ? { ...c, filtro: { ...c.filtro, [campo]: valor || undefined } } : c)),
    );
  }

  function mover(id: string, direccion: -1 | 1) {
    setColecciones((prev) => {
      const i = prev.findIndex((c) => c.id === id);
      const j = i + direccion;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const copia = [...prev];
      [copia[i], copia[j]] = [copia[j], copia[i]];
      return copia;
    });
  }

  function limpiarError(id: string) {
    setErrores((prev) => {
      if (!(id in prev)) return prev;
      const resto = { ...prev };
      delete resto[id];
      return resto;
    });
  }

  function eliminar(id: string) {
    setColecciones((prev) => prev.filter((c) => c.id !== id));
    setIdsEnEdicion((prev) => {
      if (!prev.has(id)) return prev;
      const copia = new Set(prev);
      copia.delete(id);
      return copia;
    });
    limpiarError(id);
  }

  function editar(id: string) {
    setIdsEnEdicion((prev) => new Set(prev).add(id));
  }

  function agregar() {
    const nueva = coleccionVacia();
    setColecciones((prev) => [...prev, nueva]);
    editar(nueva.id);
  }

  /** Cierra el formulario sin guardar: si la colección ya existía, vuelve a sus valores guardados; si es nueva (recién agregada, nunca guardada), se descarta directamente. */
  function cancelar(id: string) {
    const original = guardadas.find((g) => g.id === id);
    if (original) {
      setColecciones((prev) => prev.map((c) => (c.id === id ? original : c)));
      setIdsEnEdicion((prev) => {
        const copia = new Set(prev);
        copia.delete(id);
        return copia;
      });
      limpiarError(id);
    } else {
      eliminar(id);
    }
  }

  async function subirImagen(id: string, archivoOriginal: File) {
    setSubiendoId(id);
    try {
      const archivo = await prepararImagenParaSubir(archivoOriginal);
      const formData = new FormData();
      formData.set("archivo", archivo);
      const { resp, data } = await fetchJson<{ ok: boolean; url?: string; mensaje?: string }>("/api/admin/colecciones/imagen", {
        method: "POST",
        body: formData,
      });

      if (!resp.ok || !data || !data.ok || !data.url) {
        // Un 413 (o cualquier otro corte antes de llegar a nuestro route
        // handler) no siempre trae JSON — fetchJson ya devuelve data: null
        // en ese caso, así que se cae al mensaje genérico según el status.
        const fallback =
          resp.status === 413 ? "La imagen sigue pesando demasiado — probá con otra o recortala." : "No se pudo subir la imagen.";
        toast.error(data?.mensaje ?? fallback);
        return;
      }
      actualizar(id, { imagenUrl: data.url });
    } catch (err) {
      logError("ColeccionesConfig.subirImagen", err, "No se pudo conectar con el servidor — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setSubiendoId(null);
    }
  }

  async function guardar() {
    const nuevosErrores: Record<string, string> = {};
    for (const c of colecciones) {
      if (!c.nombre.trim()) nuevosErrores[c.id] = "Falta el nombre.";
    }
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) {
      toast.error("Revisá las colecciones sin nombre antes de guardar.");
      return;
    }

    setGuardando(true);
    try {
      const { resp, data } = await fetchJson<{ ok: boolean; colecciones?: Coleccion[]; mensaje?: string }>("/api/admin/colecciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(colecciones),
      });
      if (!resp.ok || !data || !data.ok || !data.colecciones) {
        toast.error(data?.mensaje ?? "No se pudieron guardar las colecciones.");
        return;
      }
      // Guardado exitoso = ya no queda ningún formulario abierto: TODO lo
      // que se ve ahora es, por definición, lo que hay guardado en el
      // servidor — ver la nota grande en ColeccionesConfig.tsx.
      setColecciones(data.colecciones);
      setGuardadas(data.colecciones);
      setIdsEnEdicion(new Set());
      toast.success("Colecciones actualizadas.");
    } catch (err) {
      logError("ColeccionesConfig.guardar", err, "No se pudo conectar con el servidor — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  }

  return {
    colecciones,
    guardadas,
    idsEnEdicion,
    subiendoId,
    guardando,
    errores,
    actualizar,
    actualizarFiltro,
    mover,
    eliminar,
    editar,
    agregar,
    cancelar,
    subirImagen,
    guardar,
  };
}
