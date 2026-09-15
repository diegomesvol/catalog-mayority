"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";

interface Options {
  /** Ruta de la API que cierra la sesión (distinta por árbol — ver proxy.ts). */
  endpoint: "/api/admin/logout" | "/api/cliente/logout";
  /** A dónde navegar tras cerrar sesión (login de admin o de cliente). */
  redirectTo: string;
  /** Prefijo para logError — identifica desde qué sidebar se disparó. */
  origen: string;
}

/**
 * Cierre de sesión — mismo fetch + redirect + manejo de error en los 4
 * lugares donde vive el botón "Cerrar sesión" (sidebar de escritorio y
 * drawer mobile, tanto en el panel admin como en el portal de cliente — ver
 * AdminNav/MenuMovilAdmin y ClienteNav/ClienteNavMovil). Antes esta misma
 * lógica vivía duplicada en AdminHeader y ClienteHeader; se centraliza acá
 * para no repetir el try/catch en cada componente que ahora monta el botón.
 */
export function useCerrarSesion({ endpoint, redirectTo, origen }: Options) {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    setSaliendo(true);
    try {
      await fetch(endpoint, { method: "POST" });
      router.push(redirectTo);
      router.refresh();
    } catch (err) {
      logError(origen, err, "No se pudo llegar al servidor para cerrar sesión — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo cerrar sesión. Probá de nuevo.");
      setSaliendo(false);
    }
  }

  return { saliendo, salir };
}
