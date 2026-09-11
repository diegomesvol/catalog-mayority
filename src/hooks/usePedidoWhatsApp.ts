"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { linkWhatsAppPedido, type DatosComprador, type ItemCarrito } from "@/lib/carrito";
import { logError } from "@/lib/logger";

export type ErroresComprador = Partial<Record<keyof DatosComprador, string>>;

function validarComprador(c: DatosComprador): ErroresComprador {
  const errores: ErroresComprador = {};
  if (!c.nombre.trim()) errores.nombre = "Falta el nombre.";
  if (!c.empresa.trim()) errores.empresa = "Falta el nombre de la empresa.";
  if (!c.telefono.trim()) errores.telefono = "Falta el teléfono.";
  if (!c.rif.trim()) errores.rif = "Falta el RIF.";
  return errores;
}

interface Options {
  abierto: boolean;
  cerrar: () => void;
  items: ItemCarrito[];
  comprador: DatosComprador;
  numeroWhatsApp: string | null;
  setComprador: (comprador: DatosComprador) => void;
}

/**
 * Toda la lógica de "tus datos" + envío por WhatsApp del panel del carrito —
 * CarritoDrawer.tsx solo consume esto y renderiza el formulario y el botón.
 */
export function usePedidoWhatsApp({ abierto, cerrar, items, comprador, numeroWhatsApp, setComprador }: Options) {
  const [errores, setErrores] = useState<ErroresComprador>({});

  // Cierra con Escape — patrón esperado de cualquier panel/diálogo lateral.
  useEffect(() => {
    if (!abierto) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") cerrar();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [abierto, cerrar]);

  useEffect(() => {
    if (!numeroWhatsApp) {
      logError(
        "CarritoDrawer",
        "Falta configurar el número de WhatsApp de ventas.",
        "Configuralo desde el panel de administración (Configuración → WhatsApp de ventas), o como respaldo agregá NEXT_PUBLIC_WHATSAPP_VENTAS en Vercel → el proyecto → Settings → Environment Variables (formato internacional, ej. 584121234567, sin '+' ni espacios; requiere volver a desplegar).",
      );
    }
    // Solo se registra una vez al montar el panel — no en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function campo<K extends keyof DatosComprador>(clave: K, valor: string) {
    setComprador({ ...comprador, [clave]: valor });
    if (errores[clave]) setErrores({ ...errores, [clave]: undefined });
  }

  function enviarPorWhatsApp() {
    if (items.length === 0) return;
    const erroresActuales = validarComprador(comprador);
    setErrores(erroresActuales);
    if (Object.keys(erroresActuales).length > 0) {
      // Mensaje inline junto a cada campo (en el componente) en vez de un
      // toast genérico — un toast en la esquina inferior tapa justo el botón
      // de envío, que está fijo ahí mismo. Se enfoca el primer campo con
      // error para que quede claro qué falta sin tener que leer todo el panel.
      const primerCampoConError = Object.keys(erroresActuales)[0] as keyof DatosComprador;
      document.getElementById(`comprador-${primerCampoConError}`)?.focus();
      return;
    }
    const link = linkWhatsAppPedido(items, comprador, numeroWhatsApp);
    if (!link) {
      toast.error("El envío por WhatsApp todavía no está configurado. Avisale al administrador del sitio.");
      return;
    }
    window.open(link, "_blank", "noopener,noreferrer");
  }

  return { errores, campo, enviarPorWhatsApp };
}
