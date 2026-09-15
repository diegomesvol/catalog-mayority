"use client";

import { useState } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { fetchJson } from "@/lib/apiCliente";
import type { LogoFooter } from "@/lib/types";
import { MAX_LOGOS_FOOTER, MIN_LOGOS_FOOTER } from "@/lib/schemas/logosFooter";

function logoVacio(): LogoFooter {
  return { id: crypto.randomUUID(), nombre: "", imagenUrl: null, visible: true };
}

/**
 * Todo el estado y las operaciones del bloque "Nuestras marcas" del footer
 * (alta hasta 4, reemplazo de imagen, ocultar/mostrar, borrado, guardado) —
 * mismo patrón que useColeccionesAdmin, simplificado: acá no hay modo
 * lectura/edición por tarjeta (los campos son pocos, siempre editables) ni
 * reorden (el orden de carga alcanza).
 */
export function useLogosFooterAdmin(logosIniciales: LogoFooter[]) {
  const [logos, setLogos] = useState<LogoFooter[]>(logosIniciales);
  const [subiendoId, setSubiendoId] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});

  function limpiarError(id: string) {
    setErrores((prev) => {
      if (!(id in prev)) return prev;
      const resto = { ...prev };
      delete resto[id];
      return resto;
    });
  }

  function actualizarNombre(id: string, nombre: string) {
    setLogos((prev) => prev.map((l) => (l.id === id ? { ...l, nombre } : l)));
    limpiarError(id);
  }

  function alternarVisible(id: string) {
    setLogos((prev) => prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
  }

  function eliminar(id: string) {
    setLogos((prev) => prev.filter((l) => l.id !== id));
    limpiarError(id);
  }

  function agregar() {
    if (logos.length >= MAX_LOGOS_FOOTER) {
      toast.error(`Máximo ${MAX_LOGOS_FOOTER} logos — quitá uno antes de agregar otro.`);
      return;
    }
    setLogos((prev) => [...prev, logoVacio()]);
  }

  async function subirImagen(id: string, archivo: File) {
    setSubiendoId(id);
    try {
      const formData = new FormData();
      formData.set("archivo", archivo);
      const { resp, data } = await fetchJson<{ ok: boolean; url?: string; mensaje?: string }>("/api/admin/logos-footer/imagen", {
        method: "POST",
        body: formData,
      });
      if (!resp.ok || !data || !data.ok || !data.url) {
        const fallback = resp.status === 413 ? "El logo sigue pesando demasiado — probá con otro archivo." : "No se pudo subir el logo.";
        toast.error(data?.mensaje ?? fallback);
        return;
      }
      setLogos((prev) => prev.map((l) => (l.id === id ? { ...l, imagenUrl: data.url! } : l)));
      limpiarError(id);
    } catch (err) {
      logError("useLogosFooterAdmin.subirImagen", err, "No se pudo conectar con el servidor para subir el logo.");
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setSubiendoId(null);
    }
  }

  async function guardar() {
    const nuevosErrores: Record<string, string> = {};
    for (const l of logos) {
      if (!l.nombre.trim()) nuevosErrores[l.id] = "Falta el nombre.";
      else if (!l.imagenUrl) nuevosErrores[l.id] = "Falta subir la imagen.";
    }
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) {
      toast.error("Revisá los logos incompletos antes de guardar.");
      return;
    }
    if (logos.length < MIN_LOGOS_FOOTER) {
      toast.error(`Tiene que haber al menos ${MIN_LOGOS_FOOTER} logo.`);
      return;
    }

    setGuardando(true);
    try {
      const { resp, data } = await fetchJson<{ ok: boolean; logos?: LogoFooter[]; mensaje?: string }>("/api/admin/logos-footer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logos),
      });
      if (!resp.ok || !data || !data.ok || !data.logos) {
        toast.error(data?.mensaje ?? "No se pudieron guardar los logos.");
        return;
      }
      setLogos(data.logos);
      toast.success("Logos del footer actualizados.");
    } catch (err) {
      logError("useLogosFooterAdmin.guardar", err, "No se pudo conectar con el servidor — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  }

  return {
    logos,
    subiendoId,
    guardando,
    errores,
    actualizarNombre,
    alternarVisible,
    eliminar,
    agregar,
    subirImagen,
    guardar,
  };
}
