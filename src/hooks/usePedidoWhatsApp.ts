"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { linkWhatsAppPedido, totalCarrito, type DatosComprador, type DatosEnvio, type ItemCarrito } from "@/lib/carrito";
import { logError } from "@/lib/logger";

export type ErroresComprador = Partial<Record<keyof DatosComprador, string>>;
export type ErroresEnvio = Partial<Record<keyof DatosEnvio, string>>;

interface RespuestaPedido {
  ok: boolean;
  pedido?: { id: string };
  mensaje?: string;
}

function payloadEnvio(datosEnvio: DatosEnvio) {
  // "" (sin elegir) se manda como undefined — crearPedidoSchema los toma
  // como opcionales, así que un pedido sin estos datos completos (ej. el
  // guardado silencioso de "Enviar por WhatsApp") igual pasa la validación.
  return {
    metodoPago: datosEnvio.metodoPago || undefined,
    metodoEnvio: datosEnvio.metodoEnvio || undefined,
    direccionEnvio: datosEnvio.direccionEnvio.trim() || undefined,
  };
}

// Guarda el pedido en /api/cliente/pedidos, SUMADO al envío por WhatsApp de
// siempre (no lo reemplaza — ver la nota grande más abajo, en
// enviarPorWhatsApp). Deliberadamente sin await desde el llamador: un fallo
// acá nunca debe impedir ni demorar el envío por WhatsApp, que es el flujo
// principal y el único que existía hasta ahora. Por el mismo motivo no
// exige datosEnvio completo (ver payloadEnvio) — ese chequeo estricto es
// solo para "Realizar pedido" (ver validarEnvio + realizarPedido).
async function persistirPedido(items: ItemCarrito[], comprador: DatosComprador, total: number, datosEnvio: DatosEnvio) {
  try {
    const resp = await fetch("/api/cliente/pedidos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, comprador, total, ...payloadEnvio(datosEnvio) }),
    });
    if (!resp.ok) {
      const data = await resp.json().catch(() => null);
      logError("usePedidoWhatsApp.persistirPedido", (data?.mensaje as string | undefined) ?? `HTTP ${resp.status}`);
    }
  } catch (err) {
    logError(
      "usePedidoWhatsApp.persistirPedido",
      err,
      "No se pudo guardar el pedido en la cuenta del cliente — el envío por WhatsApp igual se realizó, así que no se le muestra ningún error.",
    );
  }
}

function validarComprador(c: DatosComprador): ErroresComprador {
  const errores: ErroresComprador = {};
  if (!c.nombre.trim()) errores.nombre = "Falta el nombre.";
  if (!c.empresa.trim()) errores.empresa = "Falta el nombre de la empresa.";
  if (!c.telefono.trim()) errores.telefono = "Falta el teléfono.";
  if (!c.rif.trim()) errores.rif = "Falta el RIF.";
  return errores;
}

// Solo se exige para "Realizar pedido" (flujo que persiste en el sistema y
// que el admin va a hacerle seguimiento) — "Enviar por WhatsApp" nunca se
// bloquea por esto, ver la nota en persistirPedido.
function validarEnvio(d: DatosEnvio): ErroresEnvio {
  const errores: ErroresEnvio = {};
  if (!d.metodoPago) errores.metodoPago = "Elegí un método de pago.";
  if (!d.metodoEnvio) errores.metodoEnvio = "Elegí un método de envío.";
  if (!d.direccionEnvio.trim()) errores.direccionEnvio = "Falta la dirección de despacho.";
  return errores;
}

interface Options {
  abierto: boolean;
  cerrar: () => void;
  items: ItemCarrito[];
  comprador: DatosComprador;
  datosEnvio: DatosEnvio;
  numeroWhatsApp: string | null;
  // Si hay un cliente logueado (ver CarritoContext/RootLayout), el pedido
  // también se guarda en /api/cliente/pedidos — ver enviarPorWhatsApp.
  clienteLogueado: boolean;
  // clientes.perfil_completo — condición para "Realizar pedido" (ver
  // realizarPedido). No afecta a enviarPorWhatsApp, que no cambió.
  perfilCompleto: boolean;
  setComprador: (comprador: DatosComprador) => void;
  setDatosEnvio: (datosEnvio: DatosEnvio) => void;
  vaciar: () => void;
}

/**
 * Toda la lógica de "tus datos" + envío por WhatsApp + "Realizar pedido" del
 * panel del carrito — CarritoDrawer.tsx solo consume esto y renderiza el
 * formulario y los botones.
 */
export function usePedidoWhatsApp({
  abierto,
  cerrar,
  items,
  comprador,
  datosEnvio,
  numeroWhatsApp,
  clienteLogueado,
  perfilCompleto,
  setComprador,
  setDatosEnvio,
  vaciar,
}: Options) {
  const router = useRouter();
  const [errores, setErrores] = useState<ErroresComprador>({});
  const [erroresEnvio, setErroresEnvio] = useState<ErroresEnvio>({});
  // Dispara la animación de "shake" en el botón "Realizar pedido" cuando el
  // perfil está incompleto — se apaga sola después de la animación (ver
  // CarritoDrawer, que le pone la clase animate-shake mientras esto es true).
  const [temblando, setTemblando] = useState(false);
  const [enviandoPedido, setEnviandoPedido] = useState(false);

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

  function campoEnvio<K extends keyof DatosEnvio>(clave: K, valor: string) {
    setDatosEnvio({ ...datosEnvio, [clave]: valor });
    if (erroresEnvio[clave]) setErroresEnvio({ ...erroresEnvio, [clave]: undefined });
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
    // Se SUMA al envío por WhatsApp, no lo reemplaza (requisito explícito):
    // sin await a propósito — si esto falla, el envío por WhatsApp de abajo
    // tiene que pasar igual, sin demora y sin mostrarle ningún error al
    // comprador (ver persistirPedido). Solo se intenta si hay una cuenta de
    // cliente logueada; para un comprador anónimo no hay dónde guardarlo.
    if (clienteLogueado) {
      void persistirPedido(items, comprador, totalCarrito(items), datosEnvio);
    }
    window.open(link, "_blank", "noopener,noreferrer");
  }

  // "Realizar pedido" — guarda el pedido en el sistema (estado "pendiente",
  // ver /api/cliente/pedidos) SIN abrir WhatsApp: flujo nuevo, separado del
  // de arriba (ver la nota grande en enviarPorWhatsApp — ese no cambió).
  // Requiere perfil completo; si falta, tiembla + toast de advertencia en
  // vez de dejar seguir (requisito explícito).
  async function realizarPedido() {
    if (items.length === 0 || enviandoPedido) return;

    if (!perfilCompleto) {
      setTemblando(true);
      setTimeout(() => setTemblando(false), 400);
      toast.warning("Completá tu perfil para poder realizar pedidos.", {
        action: { label: "Completar perfil", onClick: () => router.push("/cliente/perfil") },
      });
      return;
    }

    const erroresActuales = validarComprador(comprador);
    const erroresEnvioActuales = validarEnvio(datosEnvio);
    setErrores(erroresActuales);
    setErroresEnvio(erroresEnvioActuales);
    if (Object.keys(erroresActuales).length > 0) {
      const primerCampoConError = Object.keys(erroresActuales)[0] as keyof DatosComprador;
      document.getElementById(`comprador-${primerCampoConError}`)?.focus();
      return;
    }
    if (Object.keys(erroresEnvioActuales).length > 0) {
      const primerCampoConError = Object.keys(erroresEnvioActuales)[0] as keyof DatosEnvio;
      document.getElementById(`envio-${primerCampoConError}`)?.focus();
      return;
    }

    setEnviandoPedido(true);
    try {
      const resp = await fetch("/api/cliente/pedidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, comprador, total: totalCarrito(items), ...payloadEnvio(datosEnvio) }),
      });
      const data = (await resp.json().catch(() => null)) as RespuestaPedido | null;
      if (!resp.ok || !data?.ok || !data.pedido) {
        toast.error(data?.mensaje ?? "No se pudo realizar el pedido.");
        setEnviandoPedido(false);
        return;
      }

      toast.success("Pedido realizado — lo vas a poder seguir desde Mis pedidos.");
      vaciar();
      cerrar();
      router.push(`/cliente/pedidos/${data.pedido.id}`);
    } catch (err) {
      logError("usePedidoWhatsApp.realizarPedido", err, "No se pudo conectar con el servidor — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo conectar con el servidor.");
      setEnviandoPedido(false);
    }
  }

  return { errores, erroresEnvio, campo, campoEnvio, enviarPorWhatsApp, realizarPedido, temblando, enviandoPedido };
}
