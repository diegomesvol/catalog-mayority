"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import type { DiffCatalogo, ResumenImportacion } from "@/lib/types";
import { logError } from "@/lib/logger";
import { fetchJson } from "@/lib/apiCliente";

export type OrigenCarga = "csv" | "xlsx" | "sheet";
export type EstadoCarga = "inicial" | "procesando" | "previsualizando" | "confirmando" | "confirmado" | "rechazado";

// El archivo pasa por nuestra función serverless (/api/admin/upload), así
// que está sujeto al límite real de body de Vercel: 4.5 MB. Antes se subía
// directo del navegador a Vercel Blob para evitar ese límite, pero ese
// camino (vercel.com/api/blob) está devolviendo respuestas sin cabecera CORS
// en este proyecto — confirmado con multipart y sin multipart, y es un
// problema del lado de Vercel (reportado en su propio foro de comunidad),
// no de este código. Mientras eso no se resuelva, se vuelve al camino
// simple: 4 MB de margen, por debajo del límite real de 4.5 MB.
export const TAMANO_MAXIMO_BYTES = 4 * 1024 * 1024;
const EXTENSIONES: Record<"csv" | "xlsx", string[]> = {
  csv: [".csv"],
  xlsx: [".xlsx", ".xls", ".xlsm"],
};

function extensionValida(nombre: string, origen: "csv" | "xlsx"): boolean {
  const nombreLower = nombre.toLowerCase();
  return EXTENSIONES[origen].some((ext) => nombreLower.endsWith(ext));
}

interface Options {
  onOperacionCriticaChange?: (enCurso: boolean) => void;
}

/**
 * Toda la lógica de carga/previsualización/confirmación del catálogo —
 * CargadorCatalogo.tsx solo consume esto y renderiza según `estado`.
 */
export function useCargadorCatalogo({ onOperacionCriticaChange }: Options) {
  const [origen, setOrigen] = useState<OrigenCarga>("xlsx");
  const [url, setUrl] = useState("");
  const [estado, setEstado] = useState<EstadoCarga>("inicial");
  const [resumen, setResumen] = useState<ResumenImportacion | null>(null);
  const [diff, setDiff] = useState<DiffCatalogo | null>(null);
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  async function subir(archivo: File | null) {
    if (origen === "sheet") {
      if (!url.trim()) {
        toast.error("Pegá el link de Google Sheets antes de continuar.");
        return;
      }
      if (!/^https:\/\//.test(url.trim())) {
        toast.error("El link tiene que empezar con https://.");
        return;
      }
    } else {
      if (!archivo) {
        toast.error("Seleccioná un archivo primero.");
        return;
      }
      if (!extensionValida(archivo.name, origen)) {
        toast.error(
          `Elegiste "${origen === "xlsx" ? "Archivo Excel" : "Archivo CSV"}" pero el archivo es "${archivo.name}". Cambiá el origen o el archivo.`,
        );
        return;
      }
      if (archivo.size > TAMANO_MAXIMO_BYTES) {
        toast.error(
          `El archivo pesa ${(archivo.size / (1024 * 1024)).toFixed(1)} MB — el límite es ${TAMANO_MAXIMO_BYTES / (1024 * 1024)} MB.`,
        );
        return;
      }
    }

    setEstado("procesando");

    const idCarga = toast.loading(origen === "sheet" ? "Analizando archivo…" : "Subiendo archivo…");

    try {
      const formData = new FormData();

      if (origen === "sheet") {
        formData.set("tipo", "sheet");
        formData.set("url", url.trim());
      } else if (archivo) {
        setNombreArchivo(archivo.name);
        formData.set("tipo", origen);
        formData.set("archivo", archivo);
      } else {
        toast.error("Seleccioná un archivo primero.", { id: idCarga });
        setEstado("inicial");
        return;
      }

      const { resp, data } = await fetchJson<{ ok: boolean; resumen?: ResumenImportacion; diff?: DiffCatalogo; mensaje?: string }>(
        "/api/admin/upload",
        { method: "POST", body: formData },
      );

      if (!resp.ok) {
        if (data?.resumen) {
          setResumen(data.resumen);
          setEstado("rechazado");
          toast.error("Archivo rechazado — revisá el detalle.", { id: idCarga });
        } else {
          toast.error(data?.mensaje ?? "No se pudo procesar el archivo.", { id: idCarga });
          setEstado("inicial");
        }
        return;
      }

      setResumen(data?.resumen ?? null);
      setDiff(data?.diff ?? null);
      setEstado("previsualizando");
      toast.success("Archivo analizado. Revisá el resumen antes de confirmar.", { id: idCarga });
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo subir o procesar el archivo.";
      logError("CargadorCatalogo.subir", err);
      toast.error(mensaje, { id: idCarga });
      setEstado("inicial");
    }
  }

  async function confirmar() {
    setEstado("confirmando");
    onOperacionCriticaChange?.(true);
    const idCarga = toast.loading("Reemplazando catálogo…");
    try {
      const { resp, data } = await fetchJson<{ ok: boolean; totalProductos?: number; totalVariantes?: number; mensaje?: string }>(
        "/api/admin/confirm",
        { method: "POST" },
      );
      if (!resp.ok || !data || !data.ok) {
        toast.error(data?.mensaje ?? "No se pudo confirmar el reemplazo.", { id: idCarga });
        setEstado("previsualizando");
        return;
      }
      toast.success("Catálogo reemplazado y publicado.", { id: idCarga });
      setEstado("confirmado");
    } catch (err) {
      logError("CargadorCatalogo.confirmar", err, "No se pudo llegar al servidor — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo conectar con el servidor.", { id: idCarga });
      setEstado("previsualizando");
    } finally {
      onOperacionCriticaChange?.(false);
    }
  }

  function cancelar() {
    setResumen(null);
    setDiff(null);
    setEstado("inicial");
    setNombreArchivo(null);
    if (inputArchivoRef.current) inputArchivoRef.current.value = "";
  }

  function nuevaCarga() {
    setResumen(null);
    setDiff(null);
    setEstado("inicial");
    setNombreArchivo(null);
    setUrl("");
    if (inputArchivoRef.current) inputArchivoRef.current.value = "";
  }

  return {
    origen,
    setOrigen,
    url,
    setUrl,
    estado,
    resumen,
    diff,
    nombreArchivo,
    setNombreArchivo,
    inputArchivoRef,
    subir,
    confirmar,
    cancelar,
    nuevaCarga,
  };
}
