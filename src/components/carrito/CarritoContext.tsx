"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { COMPRADOR_VACIO, numeroWhatsAppVentas, type DatosComprador, type ItemCarrito } from "@/lib/carrito";
import { logError } from "@/lib/logger";

const CLAVE_CARRITO = "mesvol-carrito-v1";
const CLAVE_COMPRADOR = "mesvol-comprador-v1";

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
  agregarItem: (item: Omit<ItemCarrito, "cantidad">, cantidad: number, opciones?: OpcionesAgregarItem) => void;
  actualizarCantidad: (itemId: string, cantidad: number) => void;
  quitarItem: (itemId: string) => void;
  vaciar: () => void;
  setComprador: (comprador: DatosComprador) => void;
  abrir: () => void;
  cerrar: () => void;
}

const CarritoContext = createContext<CarritoContextValor | null>(null);

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
}

export function CarritoProvider({ children, numeroWhatsApp: numeroConfigurado, clienteLogueado, perfilCompleto }: Props) {
  // Arranca vacío en el server y en el primer render del cliente (evita
  // desajustes de hidratación); el contenido real de localStorage se carga
  // recién en el useEffect, que solo corre en el navegador.
  const [hidratado, setHidratado] = useState(false);
  const [items, setItems] = useState<ItemCarrito[]>([]);
  const [comprador, setCompradorState] = useState<DatosComprador>(COMPRADOR_VACIO);
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
    setHidratado(true);
  }, []);

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
      agregarItem,
      actualizarCantidad,
      quitarItem,
      vaciar,
      setComprador: setCompradorState,
      abrir,
      cerrar,
    }),
    [items, comprador, abierto, numeroWhatsApp, clienteLogueado, perfilCompleto, agregarItem, actualizarCantidad, quitarItem, vaciar, abrir, cerrar],
  );

  return <CarritoContext.Provider value={valor}>{children}</CarritoContext.Provider>;
}

export function useCarrito(): CarritoContextValor {
  const ctx = useContext(CarritoContext);
  if (!ctx) throw new Error("useCarrito debe usarse dentro de <CarritoProvider>.");
  return ctx;
}
