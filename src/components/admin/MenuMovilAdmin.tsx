"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ADMIN, esItemActivo, itemsVisibles } from "@/lib/adminNav";
import type { RolAdmin } from "@/lib/auth";
import { useBloqueoScroll } from "@/hooks/useBloqueoScroll";

// Botón de hamburguesa + drawer de navegación para mobile/tablet (por debajo
// de "lg") — AdminNav.tsx sigue siendo la navegación de "lg" en adelante,
// ambos leen NAV_ADMIN para no duplicar la lista de secciones. Mismo patrón
// visual que CarritoDrawer.tsx (overlay + panel que desliza), pero acá el
// panel entra desde la IZQUIERDA para no confundirse con el carrito (que
// entra desde la derecha) — dos paneles con el mismo gesto pero direcciones
// opuestas ayudan a distinguir "esto es navegación" de "esto es tu pedido".
export function MenuMovilAdmin({ rol }: { rol: RolAdmin | null }) {
  const pathname = usePathname();
  const [abierto, setAbierto] = useState(false);
  const idPanel = useId();
  const botonRef = useRef<HTMLButtonElement>(null);
  const items = itemsVisibles(NAV_ADMIN, rol);

  // Bloquea el scroll de atrás mientras el drawer está abierto (pedido
  // explícito) — ver la nota en el hook.
  useBloqueoScroll(abierto);

  function cerrar() {
    setAbierto(false);
    // Devuelve el foco al botón que abrió el menú — sin esto, tras cerrar
    // con Escape/backdrop/X, el foco queda "perdido" en el body.
    botonRef.current?.focus();
  }

  // Cierra con Escape — mismo patrón que CarritoDrawer (usePedidoWhatsApp).
  useEffect(() => {
    if (!abierto) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") cerrar();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [abierto]);

  // Red de seguridad además del onClick de cada Link de abajo: si la ruta
  // cambia por otro medio (gesto de "atrás" del navegador, por ejemplo)
  // mientras el menú está abierto, se cierra solo en vez de quedar tapando
  // la página nueva. Sin cerrar() (no corresponde devolver el foco acá: la
  // navegación ya movió el foco por su cuenta). El "await" inicial difiere
  // el setState un microtask — evita el warning set-state-in-effect (ver la
  // misma nota en ClientesAdmin/PedidosAdmin) sin cambiar el comportamiento.
  useEffect(() => {
    async function cerrarPorNavegacion() {
      await Promise.resolve();
      setAbierto(false);
    }
    cerrarPorNavegacion();
  }, [pathname]);

  return (
    <>
      <button
        ref={botonRef}
        type="button"
        onClick={() => setAbierto(true)}
        aria-expanded={abierto}
        aria-controls={idPanel}
        aria-label="Abrir menú"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-700 transition-colors hover:bg-ink-100 lg:hidden"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>

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
        aria-label="Menú de navegación"
        className={`fixed inset-y-0 left-0 z-50 flex w-full max-w-xs flex-col bg-paper-raised shadow-2xl transition-transform duration-300 lg:hidden ${
          abierto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-ink-200 px-4 py-3.5">
          <span className="text-base font-semibold text-ink-900">Panel de administración</span>
          <button
            type="button"
            onClick={cerrar}
            autoFocus={abierto}
            aria-label="Cerrar menú"
            className="rounded-full p-1.5 text-ink-500 hover:bg-ink-100 hover:text-ink-900"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3" aria-label="Secciones del panel">
          {items.map((item) => {
            const activo = esItemActivo(item, pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={activo ? "page" : undefined}
                onClick={() => setAbierto(false)}
                className={`rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  activo ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-ink-100"
                }`}
              >
                {item.etiqueta}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
