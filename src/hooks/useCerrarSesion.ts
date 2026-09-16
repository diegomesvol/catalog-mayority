"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";

interface Options {
  /** Ruta de la API que cierra la sesión (distinta por árbol — ver proxy.ts). */
  endpoint: "/api/admin/logout" | "/api/cliente/logout";
  // A dónde navegar tras cerrar sesión (login de admin o de cliente).
  // Omitido en el catálogo público (CuentaClienteMenu/MenuMovilCatalogo): un
  // cliente puede estar en medio del catálogo, así que ahí solo se refresca
  // la página actual (vuelve a "Ingresar") sin sacarlo de donde estaba.
  redirectTo?: string;
  /** Prefijo para logError — identifica desde qué componente se disparó. */
  origen: string;
}

/**
 * Cierre de sesión — mismo fetch + refresh + manejo de error en todos los
 * lugares donde vive el botón "Cerrar sesión": sidebar de escritorio y
 * drawer mobile del panel admin y del portal de cliente (AdminNav/
 * MenuMovilAdmin, ClienteNav/ClienteNavMovil, con redirectTo al login de
 * cada árbol) y el menú de cuenta del catálogo público (CuentaClienteMenu/
 * MenuMovilCatalogo, sin redirectTo). Antes esta misma lógica vivía
 * duplicada en cada uno de esos componentes; se centraliza acá para no
 * repetir el try/catch en cada uno.
 */
export function useCerrarSesion({ endpoint, redirectTo, origen }: Options) {
  const router = useRouter();
  const [saliendo, setSaliendo] = useState(false);

  async function salir() {
    setSaliendo(true);
    try {
      await fetch(endpoint, { method: "POST" });
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch (err) {
      logError(origen, err, "No se pudo llegar al servidor para cerrar sesión — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo cerrar sesión. Probá de nuevo.");
      setSaliendo(false);
    }
  }

  return { saliendo, salir };
}
