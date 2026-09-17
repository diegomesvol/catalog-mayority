"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useBloqueoScroll } from "@/hooks/useBloqueoScroll";
import { useCerrarSesion } from "@/hooks/useCerrarSesion";
import { useCarritoResumen } from "@/components/carrito/CarritoContext";
import { iniciales } from "@/lib/format";
import { DescargaOfflineInline } from "./DescargaOfflineInline";

interface ClienteSesion {
  nombre: string;
  email: string;
  avatarUrl: string | null;
}

interface Props {
  cliente: ClienteSesion | null;
  // Mismo fallback que CuentaClienteMenu (logo de la tienda cuando no hay
  // foto de Google) — ver la nota en ese componente.
  logoTiendaUrl?: string | null;
}

// true solo en el navegador (false en SSR/hidratación) sin setState en un efecto.
const suscribirNada = () => () => {};

// Botón de hamburguesa + drawer para el header del catálogo público, por
// debajo de "lg" (Header.tsx pasa a mostrar todo inline desde ahí, incluida
// CuentaClienteMenu, y deja de montar esto — mismo breakpoint que usa
// ClienteNav para su sidebar, ver la nota grande en Header.tsx sobre por qué
// "lg" y no "sm"). Mismo patrón que MenuMovilAdmin.tsx (overlay + panel que
// desliza, Escape/backdrop cierran, useBloqueoScroll), pero acá el panel
// entra desde la
// IZQUIERDA por el mismo motivo que en admin: CarritoDrawer ya entra desde
// la derecha, y dos paneles con el mismo gesto pero direcciones opuestas
// evitan confundir "esto es navegación/cuenta" con "esto es tu pedido" —
// aunque el pedido AHORA se abre desde ACÁ ADENTRO (ver el botón "Ver
// pedido" más abajo), sigue siendo un panel visualmente distinto
// (CarritoDrawer) que se superpone encima al tocarlo.
//
// "Descargar", los accesos de cuenta ("Ingresar", o "Catálogo"/"Mis
// pedidos"/"Mi perfil" con sesión activa) y "Pedido" viven como filas de
// ancho completo acá adentro (no como pills sueltas en el header): en mobile
// se apilaban/superponían con el buscador en cuanto cualquiera crecía (ej. el
// botón de cancelar de DescargaOffline mientras descarga). Con la sesión
// activa se ve avatar/iniciales + nombre + email (mismo dato que
// CuentaClienteMenu) y "Cerrar sesión" queda destacado en rojo, mismo
// criterio que el resto del sitio (ver BotonCerrarSesion en los paneles
// admin/cliente) — acá sin ese componente compartido porque el suyo asume
// un sidebar vertical (rounded-lg, ancho fijo) y esto ya es una fila de
// drawer con su propio ancho completo.
//
// Este es el ÚNICO menú mobile en toda la app con sesión activa (catálogo o
// "Mi cuenta" — ver la nota grande en ClienteHeader.tsx y en ClienteNav.tsx):
// por eso, con `cliente`, expone los mismos 3 accesos que ClienteNav en
// desktop (Catálogo/Mis pedidos/Mi perfil) en vez de un solo link genérico —
// antes existía "ClienteNavMovil", un nav horizontal aparte que se mostraba
// SOLO dentro de /cliente/*; ese menú duplicado (y distinto a este drawer) es
// lo que hacía que /cliente mostrara una interfaz visualmente rota al
// navegar ahí logueado. Ya no existe: este drawer es el mismo en todas
// partes.
export function MenuMovilCatalogo({ cliente, logoTiendaUrl = null }: Props) {
  const [abierto, setAbierto] = useState(false);
  // El backdrop + <aside> se montan vía createPortal directo a document.body
  // (ver el return más abajo): el <header> del catálogo tiene backdrop-blur,
  // y backdrop-filter/filter crean un nuevo containing block para los
  // descendientes "fixed" (spec de CSS Filter Effects) — sin el portal, el
  // "fixed inset-y-0" del <aside> se resuelve contra la caja chica del
  // header en vez del viewport, y el panel queda cortado a la mitad en vez
  // de ocupar el alto completo de la pantalla. document.body no existe en
  // el render de servidor, así que el portal espera a este guard de montaje
  // para evitar el mismatch de hidratación.
  const montado = useSyncExternalStore(suscribirNada, () => true, () => false);
  const idPanel = useId();
  const botonRef = useRef<HTMLButtonElement>(null);
  const { items, abrir: abrirCarrito } = useCarritoResumen();
  const cantidadCarrito = items.length;
  // Sin redirectTo: el cliente está en medio del catálogo, así que cerrar
  // sesión solo refresca esta misma página (vuelve a "Ingresar" en el
  // drawer) en vez de mandarlo a /cliente/login — mismo criterio que
  // CuentaClienteMenu.
  const { saliendo, salir } = useCerrarSesion({ endpoint: "/api/cliente/logout", origen: "MenuMovilCatalogo.salir" });

  useBloqueoScroll(abierto);

  function cerrar() {
    setAbierto(false);
    botonRef.current?.focus();
  }

  function tocarSalir() {
    cerrar();
    salir();
  }

  useEffect(() => {
    if (!abierto) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") cerrar();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [abierto]);

  // Si el viewport pasa a "lg" o más ancho mientras el drawer está abierto
  // (ej. agrandar la ventana en desktop), el header ya deja de mostrar el
  // botón de hamburguesa (lg:hidden) pero el panel seguiría técnicamente
  // "abierto" — se cierra solo para no dejar el scroll del body bloqueado
  // sin ningún disparador visible para cerrarlo.
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    function onChange(e: MediaQueryListEvent) {
      if (e.matches) setAbierto(false);
    }
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  function tocarPedido() {
    cerrar();
    abrirCarrito();
  }

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto(true)}
        aria-expanded={abierto}
        aria-controls={idPanel}
        aria-label="Abrir menú"
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-700 transition-colors hover:bg-ink-100 lg:hidden"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
        {cantidadCarrito > 0 && (
          <span
            className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-600 px-1 text-[10px] font-semibold text-white"
            aria-hidden="true"
          >
            {cantidadCarrito}
          </span>
        )}
      </button>

      {montado &&
        createPortal(
          <>
            {abierto && (
              <button
                type="button"
                aria-label="Cerrar menú"
                onClick={cerrar}
                className="fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-[1px] lg:hidden"
              />
            )}

            <aside
              id={idPanel}
              role="dialog"
              aria-modal="true"
              aria-label="Menú del catálogo"
              // Cerrado queda fuera de pantalla pero en el DOM: sin esto el lector
              // de pantalla y el Tab seguían entrando a un diálogo invisible.
              aria-hidden={!abierto}
              inert={!abierto}
              className={`fixed inset-y-0 left-0 z-50 flex w-full max-w-xs flex-col bg-paper-raised shadow-2xl transition-transform duration-300 lg:hidden ${
                abierto ? "translate-x-0" : "-translate-x-full"
              }`}
            >
              {/* py-3 (no py-3.5): misma altura de fila que la barra
                  compacta de Header.tsx (px-4 py-3 + botón h-11) — para que
                  el border-b de acá coincida exactamente con el border-b del
                  header por detrás, en vez de quedar una línea corrida unos
                  píxeles más abajo (el "efecto de doble borde" reportado). */}
              <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3">
                <span className="text-base font-semibold text-ink-900">Menú</span>
                <button
                  type="button"
                  onClick={cerrar}
                  autoFocus={abierto}
                  aria-label="Cerrar menú"
                  className="flex h-11 w-11 items-center justify-center rounded-full text-ink-500 hover:bg-ink-100 hover:text-ink-900"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {/* Sesión activa: avatar/iniciales + nombre + email arriba de todo,
                  mismo dato que muestra CuentaClienteMenu desde "lg" — así el
                  drawer también confirma de un vistazo quién está logueado. */}
              {cliente && (
                <div className="flex items-center gap-3 border-b border-ink-200 px-4 py-3.5">
                  {cliente.avatarUrl || logoTiendaUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- foto de Google o logo de la tienda en Supabase Storage, dominio externo
                    <img
                      src={cliente.avatarUrl ?? logoTiendaUrl!}
                      alt=""
                      className={`h-9 w-9 shrink-0 rounded-full object-cover ${cliente.avatarUrl ? "" : "border border-ink-200 bg-white object-contain p-0.5"}`}
                    />
                  ) : (
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink-900 text-sm font-semibold text-white">
                      {iniciales(cliente.nombre)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-ink-900">{cliente.nombre}</p>
                    <p className="truncate text-xs text-ink-500">{cliente.email}</p>
                  </div>
                </div>
              )}

              {/* flex-col + gap generoso entre filas: cada una es un botón/link de
                  ancho completo con suficiente padding vertical (py-3) como para
                  que un toque accidental en una no dispare la de al lado. */}
              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Acciones del catálogo">
                <button
                  type="button"
                  onClick={tocarPedido}
                  className="flex items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm font-medium text-ink-900 transition-colors hover:bg-ink-100"
                >
                  <span className="flex items-center gap-3">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true" className="shrink-0">
                      <circle cx="9" cy="21" r="1" />
                      <circle cx="20" cy="21" r="1" />
                      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Ver pedido
                  </span>
                  {cantidadCarrito > 0 && (
                    <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent-600 px-1 text-xs font-semibold text-white">
                      {cantidadCarrito}
                    </span>
                  )}
                </button>

                {cliente ? (
                  <>
                    <Link
                      href="/"
                      onClick={cerrar}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-100"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true" className="shrink-0">
                        <path d="M3 7h18M3 12h18M3 17h18" strokeLinecap="round" />
                      </svg>
                      Catálogo
                    </Link>
                    <Link
                      href="/cliente"
                      onClick={cerrar}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-100"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true" className="shrink-0">
                        <path d="M9 3h6a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2V4a1 1 0 0 1 1-1Z" />
                        <path d="M9 12h6M9 16h6" strokeLinecap="round" />
                      </svg>
                      Mis pedidos
                    </Link>
                    <Link
                      href="/cliente/perfil"
                      onClick={cerrar}
                      className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-100"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true" className="shrink-0">
                        <circle cx="12" cy="8" r="3.5" />
                        <path d="M4.5 20c1.4-3.4 4.4-5.5 7.5-5.5s6.1 2.1 7.5 5.5" strokeLinecap="round" />
                      </svg>
                      Mi perfil
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/cliente/login"
                    onClick={cerrar}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-100"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true" className="shrink-0">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    Ingresar
                  </Link>
                )}

                {/* Cerrar sesión: única acción destructiva/de salida del drawer,
                    siempre en rojo (texto + ícono) — mismo criterio que el resto
                    del sitio (ver BotonCerrarSesion en los paneles admin/cliente).
                    Solo con sesión activa. */}
                {cliente && (
                  <button
                    type="button"
                    onClick={tocarSalir}
                    disabled={saliendo}
                    className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-danger-600 transition-colors hover:bg-danger-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true" className="shrink-0">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {saliendo ? "Saliendo…" : "Cerrar sesión"}
                  </button>
                )}

                <div className="mt-2 border-t border-ink-200 px-3 pt-3">
                  <span className="mb-2 block text-xs font-medium text-ink-500">Catálogo sin conexión</span>
                  <DescargaOfflineInline />
                </div>
              </nav>
            </aside>
          </>,
          document.body,
        )}
    </>
  );
}
