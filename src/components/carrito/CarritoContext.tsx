"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { COMPRADOR_VACIO, DATOS_ENVIO_VACIO, numeroWhatsAppVentas, type DatosComprador, type DatosEnvio, type ItemCarrito } from "@/lib/carrito";
import { logError } from "@/lib/logger";

const CLAVE_CARRITO = "mesvol-carrito-v1";
const CLAVE_COMPRADOR = "mesvol-comprador-v1";
const CLAVE_ENVIO = "mesvol-envio-v1";

interface OpcionesAgregarItem {
  // false para agregar "de paso" (ej. botón rápido en la tarjeta del
  // catálogo) sin interrumpir al comprador con el panel del carrito —
  // por defecto true, que es el comportamiento de siempre (detalle de
  // producto: agregar SÍ abre el panel para confirmar visualmente).
  abrirDrawer?: boolean;
}

interface CarritoContextValor {
  items: ItemCarrito[];
  comprador: DatosComprador;
  abierto: boolean;
  // Número de WhatsApp de ventas ya resuelto: el que haya configurado el
  // admin desde /admin/configuracion (ConfigSitio, vía prop numeroWhatsApp
  // de CarritoProvider) o, si no configuró ninguno, el de la variable de
  // entorno NEXT_PUBLIC_WHATSAPP_VENTAS. null si ninguno de los dos está
  // disponible — ver CarritoDrawer, que deshabilita el envío en ese caso.
  numeroWhatsApp: string | null;
  // Resuelto en el servidor (RootLayout, vía obtenerClienteActivo) y pasado
  // como prop, mismo motivo que numeroWhatsApp — lo único que necesita
  // usePedidoWhatsApp para decidir si además de abrir WhatsApp intenta
  // guardar el pedido en /api/cliente/pedidos.
  clienteLogueado: boolean;
  // Resuelto en el servidor junto con clienteLogueado (ver esa nota) —
  // clientes.perfil_completo. false cuando no hay cliente logueado (no
  // aplica) o cuando falta completar el onboarding. Lo usa el botón
  // "Realizar pedido" del carrito para bloquear con shake+toast.
  perfilCompleto: boolean;
  // Método de pago/envío + dirección de despacho DEL PEDIDO — separado de
  // "comprador" (identidad) porque es un dato logístico, no de facturación.
  // Precargado desde el perfil al iniciar sesión (ver perfilEnvioCliente) y
  // editable en el carrito.
  datosEnvio: DatosEnvio;
  agregarItem: (item: Omit<ItemCarrito, "cantidad">, cantidad: number, opciones?: OpcionesAgregarItem) => void;
  actualizarCantidad: (itemId: string, cantidad: number) => void;
  quitarItem: (itemId: string) => void;
  vaciar: () => void;
  setComprador: (comprador: DatosComprador) => void;
  setDatosEnvio: (datosEnvio: DatosEnvio) => void;
  abrir: () => void;
  cerrar: () => void;
}

const CarritoContext = createContext<CarritoContextValor | null>(null);

// Contexto liviano aparte para "solo el contador + abrir el panel" (el
// botón del carrito en el header y el ítem del menú mobile, ver
// useCarritoResumen más abajo): antes CarritoBoton/MenuMovilCatalogo leían
// del contexto completo con useCarrito(), así que se volvían a renderizar
// en CADA tecla que el comprador tipeaba en "Tus datos"/"Pago y envío"
// dentro del carrito abierto (comprador/datosEnvio cambian ahí), aunque a
// ellos solo les importa items/abrir — hallazgo de rendimiento de la
// auditoría 2026-09-17. items/abrir siguen viviendo en CarritoContext (una
// sola fuente de verdad); este contexto solo evita que un cambio en
// comprador/datosEnvio/perfilCompleto/numeroWhatsApp/clienteLogueado
// dispare un re-render en esos dos consumidores.
interface CarritoResumenValor {
  items: ItemCarrito[];
  abrir: () => void;
}
const CarritoResumenContext = createContext<CarritoResumenValor | null>(null);

function leerDeStorage<T>(clave: string, porDefecto: T): T {
  try {
    const crudo = window.localStorage.getItem(clave);
    return crudo ? (JSON.parse(crudo) as T) : porDefecto;
  } catch (err) {
    logError(`CarritoContext.leerDeStorage(${clave})`, err, "No se pudo leer lo guardado en este navegador — se arranca desde cero.");
    return porDefecto;
  }
}

interface Props {
  children: ReactNode;
  // Resuelto en el servidor (RootLayout, a partir de ConfigSitio) y pasado
  // como prop en vez de leerse acá — este componente es "use client" y
  // ConfigSitio vive en Vercel Blob, del lado del servidor. null cuando el
  // admin no configuró ninguno todavía (cae al de la variable de entorno).
  numeroWhatsApp: string | null;
  // Resuelto en el servidor (RootLayout, vía obtenerClienteActivo) — ver la
  // nota en CarritoContextValor.
  clienteLogueado: boolean;
  perfilCompleto: boolean;
  // Datos del perfil del cliente logueado (los define el admin al invitar):
  // precargan "Tus datos" del carrito. null sin sesión de cliente.
  datosCliente: DatosComprador | null;
  // Método de pago / dirección de despacho ya guardados en el perfil (ver
  // clientes.metodos_pago/direccion/ciudad/estado_ubicacion) — precargan
  // datosEnvio al iniciar sesión, editable después. metodoEnvio no tiene
  // equivalente en el perfil (es un dato nuevo, solo existe por pedido), así
  // que no se precarga. null sin sesión de cliente.
  perfilEnvioCliente: { direccion: string | null; ciudad: string | null; estadoUbicacion: string | null; metodosPago: string[] } | null;
}

export function CarritoProvider({
  children,
  numeroWhatsApp: numeroConfigurado,
  clienteLogueado,
  perfilCompleto,
  datosCliente,
  perfilEnvioCliente,
}: Props) {
  // Arranca vacío en el server y en el primer render del cliente (evita
  // desajustes de hidratación); el contenido real de localStorage se carga
  // recién en el useEffect, que solo corre en el navegador.
  const [hidratado, setHidratado] = useState(false);
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [comprador, setCompradorState] = useState<DatosComprador>(COMPRADOR_VACIO);
  const [datosEnvio, setDatosEnvioState] = useState<DatosEnvio>(DATOS_ENVIO_VACIO);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    // Sincronización deliberada con localStorage (un sistema externo) al
    // montar: arranca en [] tanto en el server como en el primer render del
    // cliente para que la hidratación calce, y recién acá — ya en el
    // navegador — se reemplaza por el contenido guardado. No hay forma de
    // leer localStorage antes de esto sin arriesgar un mismatch de
    // hidratación (SSR no tiene acceso a localStorage).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(leerDeStorage(CLAVE_CARRITO, []));
    setCompradorState(leerDeStorage(CLAVE_COMPRADOR, COMPRADOR_VACIO));
    setDatosEnvioState(leerDeStorage(CLAVE_ENVIO, DATOS_ENVIO_VACIO));
    setHidratado(true);
  }, []);

  // Comprador ligado a la sesión: con cliente logueado se usan los datos de
  // su perfil; al cerrar sesión se borran. Antes quedaban en localStorage
  // del navegador y el siguiente usuario del mismo equipo veía el nombre y
  // RIF del anterior.
  const clienteAnterior = useRef(clienteLogueado);
  const nombreCliente = datosCliente?.nombre;
  const empresaCliente = datosCliente?.empresa;
  const telefonoCliente = datosCliente?.telefono;
  const rifCliente = datosCliente?.rif;
  const direccionCliente = perfilEnvioCliente?.direccion;
  const ciudadCliente = perfilEnvioCliente?.ciudad;
  const estadoUbicacionCliente = perfilEnvioCliente?.estadoUbicacion;
  const metodoPagoPorDefecto = perfilEnvioCliente?.metodosPago[0];
  useEffect(() => {
    if (!hidratado) return;
    // Capturado ANTES de actualizar el ref (más abajo): distingue "recién
    // inició sesión" de "ya estaba logueado y cambió algo del perfil", para
    // precargar datosEnvio una sola vez y no pisar lo que el cliente ya haya
    // tocado a mano en el carrito durante la sesión.
    const veniaDeslogueado = !clienteAnterior.current;
    if (clienteLogueado && nombreCliente !== undefined) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sincroniza con la sesión resuelta en el servidor
      setCompradorState({ nombre: nombreCliente, empresa: empresaCliente ?? "", telefono: telefonoCliente ?? "", rif: rifCliente ?? "" });
      if (veniaDeslogueado) {
        setDatosEnvioState((prev) => ({
          metodoPago: prev.metodoPago || metodoPagoPorDefecto || "",
          metodoEnvio: prev.metodoEnvio,
          direccionEnvio: prev.direccionEnvio || [direccionCliente, ciudadCliente, estadoUbicacionCliente].filter(Boolean).join(", "),
        }));
      }
    } else if (clienteAnterior.current && !clienteLogueado) {
      setCompradorState(COMPRADOR_VACIO);
      setDatosEnvioState(DATOS_ENVIO_VACIO);
    }
    clienteAnterior.current = clienteLogueado;
  }, [
    hidratado,
    clienteLogueado,
    nombreCliente,
    empresaCliente,
    telefonoCliente,
    rifCliente,
    metodoPagoPorDefecto,
    direccionCliente,
    ciudadCliente,
    estadoUbicacionCliente,
  ]);

  useEffect(() => {
    if (!hidratado) return;
    try {
      window.localStorage.setItem(CLAVE_CARRITO, JSON.stringify(items));
    } catch (err) {
      logError("CarritoContext (guardar carrito)", err, "No se pudo guardar el pedido en este navegador — si recargás la página podrías perderlo.");
    }
  }, [items, hidratado]);

  useEffect(() => {
    if (!hidratado) return;
    try {
      window.localStorage.setItem(CLAVE_COMPRADOR, JSON.stringify(comprador));
    } catch (err) {
      logError("CarritoContext (guardar comprador)", err, "No se pudieron guardar los datos del comprador en este navegador.");
    }
  }, [comprador, hidratado]);

  useEffect(() => {
    if (!hidratado) return;
    try {
      window.localStorage.setItem(CLAVE_ENVIO, JSON.stringify(datosEnvio));
    } catch (err) {
      logError("CarritoContext (guardar envío)", err, "No se pudieron guardar los datos de envío en este navegador.");
    }
  }, [datosEnvio, hidratado]);

  const agregarItem = useCallback((item: Omit<ItemCarrito, "cantidad">, cantidad: number, opciones?: OpcionesAgregarItem) => {
    setItems((prev) => {
      // itemId (producto+color+curva) es la identidad de la línea — dos
      // colores o dos curvas del mismo producto son líneas separadas, no se
      // mergean entre sí (ver lib/carrito.ts).
      const existente = prev.find((i) => i.itemId === item.itemId);
      if (existente) {
        // stockDisponible se refresca al valor recién calculado (item.stockDisponible)
        // por si cambió desde que se agregó esta línea por primera vez.
        const nuevaCantidad = Math.min(existente.cantidad + cantidad, item.stockDisponible);
        return prev.map((i) => (i.itemId === item.itemId ? { ...i, stockDisponible: item.stockDisponible, cantidad: nuevaCantidad } : i));
      }
      // Nunca se agrega una línea con cantidad 0 (curva sin stock real).
      const cantidadInicial = Math.min(cantidad, item.stockDisponible);
      return cantidadInicial > 0 ? [...prev, { ...item, cantidad: cantidadInicial }] : prev;
    });
    if (opciones?.abrirDrawer ?? true) setAbierto(true);
  }, []);

  const actualizarCantidad = useCallback((itemId: string, cantidad: number) => {
    setItems((prev) =>
      prev.flatMap((i) => {
        if (i.itemId !== itemId) return [i];
        const acotada = Math.min(cantidad, i.stockDisponible);
        return acotada <= 0 ? [] : [{ ...i, cantidad: acotada }];
      }),
    );
  }, []);

  const quitarItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((i) => i.itemId !== itemId));
  }, []);

  const vaciar = useCallback(() => setItems([]), []);

  // Sincroniza el carrito guardado con el catálogo vigente (precio, stock,
  // líneas eliminadas) — al cargar la página y cada vez que se abre el panel.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const sincronizando = useRef(false);
  const sincronizar = useCallback(async () => {
    const actuales = itemsRef.current;
    if (actuales.length === 0 || sincronizando.current) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;
    sincronizando.current = true;
    try {
      const resp = await fetch("/api/carrito/sincronizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: actuales.map(({ productoId, color, curvaId, cantidad }) => ({ productoId, color, curvaId, cantidad })),
        }),
      });
      const data = (await resp.json().catch(() => null)) as { ok: boolean; items?: ItemCarrito[] } | null;
      if (!resp.ok || !data?.ok || !data.items) return;

      const frescos = new Map(data.items.map((i) => [i.itemId, i]));
      let quitados = 0;
      let cambiados = 0;
      for (const i of actuales) {
        const f = frescos.get(i.itemId);
        if (!f || Math.min(i.cantidad, f.stockDisponible) <= 0) quitados++;
        else if (f.precio !== i.precio || f.stockDisponible < i.cantidad) cambiados++;
      }

      setItems((prev) =>
        prev.flatMap((i) => {
          const f = frescos.get(i.itemId);
          if (!f) return actuales.some((a) => a.itemId === i.itemId) ? [] : [i]; // agregado mientras tanto: se respeta
          const cantidad = Math.min(i.cantidad, f.stockDisponible);
          return cantidad > 0 ? [{ ...f, cantidad }] : [];
        }),
      );

      if (quitados > 0 || cambiados > 0) {
        const partes = [
          quitados > 0 ? `${quitados} producto${quitados === 1 ? "" : "s"} ya no está${quitados === 1 ? "" : "n"} disponible${quitados === 1 ? "" : "s"}` : null,
          cambiados > 0 ? `${cambiados} con precio o stock actualizado` : null,
        ].filter(Boolean);
        toast.info(`Actualizamos tu pedido con el catálogo vigente: ${partes.join(" y ")}.`);
      }
    } catch (err) {
      logError("CarritoContext.sincronizar", err, "No se pudo sincronizar el carrito con el catálogo — se mantiene lo guardado.");
    } finally {
      sincronizando.current = false;
    }
  }, []);

  useEffect(() => {
    if (hidratado) void sincronizar();
  }, [hidratado, sincronizar]);

  useEffect(() => {
    if (abierto) void sincronizar();
  }, [abierto, sincronizar]);
  const abrir = useCallback(() => setAbierto(true), []);
  const cerrar = useCallback(() => setAbierto(false), []);

  // El de ConfigSitio (panel admin) manda; si el admin no configuró ninguno
  // todavía, cae al de la variable de entorno — mismo respaldo de siempre.
  const numeroWhatsApp = numeroConfigurado ?? numeroWhatsAppVentas();

  const valor = useMemo<CarritoContextValor>(
    () => ({
      items,
      comprador,
      abierto,
      numeroWhatsApp,
      clienteLogueado,
      perfilCompleto,
      datosEnvio,
      agregarItem,
      actualizarCantidad,
      quitarItem,
      vaciar,
      setComprador: setCompradorState,
      setDatosEnvio: setDatosEnvioState,
      abrir,
      cerrar,
    }),
    [
      items,
      comprador,
      datosEnvio,
      abierto,
      numeroWhatsApp,
      clienteLogueado,
      perfilCompleto,
      agregarItem,
      actualizarCantidad,
      quitarItem,
      vaciar,
      abrir,
      cerrar,
    ],
  );

  // Memoizado aparte del "valor" grande de arriba: identidad propia, solo
  // cambia si items o abrir cambian (abrir es estable, así que en la
  // práctica solo reacciona a items) — ver la nota de CarritoResumenContext.
  const valorResumen = useMemo<CarritoResumenValor>(() => ({ items, abrir }), [items, abrir]);

  return (
    <CarritoContext.Provider value={valor}>
      <CarritoResumenContext.Provider value={valorResumen}>{children}</CarritoResumenContext.Provider>
    </CarritoContext.Provider>
  );
}

export function useCarrito(): CarritoContextValor {
  const ctx = useContext(CarritoContext);
  if (!ctx) throw new Error("useCarrito debe usarse dentro de <CarritoProvider>.");
  return ctx;
}

/**
 * Versión liviana de useCarrito() para componentes que solo necesitan el
 * contador de ítems y poder abrir el panel (CarritoBoton, MenuMovilCatalogo)
 * — no se re-renderizan cuando cambia comprador/datosEnvio/perfilCompleto/
 * numeroWhatsApp/clienteLogueado, a diferencia de useCarrito(). Ver la nota
 * en CarritoResumenContext.
 */
export function useCarritoResumen(): CarritoResumenValor {
  const ctx = useContext(CarritoResumenContext);
  if (!ctx) throw new Error("useCarritoResumen debe usarse dentro de <CarritoProvider>.");
  return ctx;
}
