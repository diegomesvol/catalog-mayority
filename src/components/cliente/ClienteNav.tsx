"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCerrarSesion } from "@/hooks/useCerrarSesion";
import { BotonCerrarSesion } from "@/components/ui/BotonCerrarSesion";
import { AvatarCliente } from "@/components/ui/AvatarCliente";

const CLAVE_COLAPSADO = "cliente-sidebar-colapsado";

interface ClienteSesion {
  nombre: string;
  email: string;
  avatarUrl: string | null;
}

// Nav del portal de cliente — mismo componente y comportamiento que AdminNav
// (colapsado/expandido persistido en localStorage, tooltips en modo
// colapsado, mismos tokens visuales; ver esa nota grande para el porqué de
// cada decisión, acá solo se documenta lo que difiere). Ahora envuelve TANTO
// el catálogo público (cuando hay sesión de cliente activa — ver
// app/page.tsx y app/producto/[id]/page.tsx) COMO "Mi cuenta" (ver
// ClienteHeader) — un solo sidebar para las dos áreas, para que no haya
// salto de navegación entre ellas. Por eso "Catálogo" es un ítem más acá
// (antes vivía aparte, como salida — dejó de tener sentido en cuanto el
// catálogo pasó a vivir DENTRO de este mismo sidebar para un cliente
// logueado, ya no es algo de lo que "salís").
const ITEMS = [
  { href: "/", etiqueta: "Catálogo", icono: <IconoCatalogo /> },
  { href: "/cliente", etiqueta: "Mis pedidos", icono: <IconoPedidos /> },
  { href: "/cliente/perfil", etiqueta: "Mi perfil", icono: <IconoPerfil /> },
] as const;

function esItemActivo(href: string, pathname: string): boolean {
  // El detalle de producto ("/producto/[id]") cuelga de "Catálogo" — no es
  // otra sección, es la misma navegación un nivel más adentro.
  if (href === "/") return pathname === "/" || pathname.startsWith("/producto");
  // "/cliente" no debe marcarse activo también para "/cliente/perfil" —
  // match exacto para esos dos, salvo pedidos/[id] que cuelga de "/cliente".
  if (href === "/cliente") return pathname === "/cliente" || pathname.startsWith("/cliente/pedidos");
  return pathname === href;
}

interface Props {
  logoUrl?: string | null;
  // Identidad de la sesión, para el bloque de avatar/nombre del pie del
  // sidebar (ver más abajo) — null solo debería darse mientras el padre
  // todavía no resolvió el perfil (mismo criterio defensivo que
  // perfilCompleto en ClienteHeader), nunca en un cliente realmente logueado.
  cliente?: ClienteSesion | null;
}

export function ClienteNav({ logoUrl = null, cliente = null }: Props) {
  const pathname = usePathname();
  const idPanel = useId();
  // "Cerrar sesión" vivía en ClienteHeader (barra superior) — se movió al
  // pie del sidebar, mismo pedido que en el panel admin (ver AdminNav).
  const { saliendo, salir } = useCerrarSesion({ endpoint: "/api/cliente/logout", redirectTo: "/cliente/login", origen: "ClienteNav.salir" });

  // Mismo mecanismo que AdminNav (ver esa nota grande ahí): localStorage
  // leído directo en el inicializador de useState. Clave propia
  // (CLAVE_COLAPSADO de acá, no la de AdminNav): son sesiones y sidebars
  // distintos, no tiene por qué compartirse el estado de colapsado de uno
  // con el otro en el mismo navegador.
  const [colapsado, setColapsado] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(CLAVE_COLAPSADO) === "1";
  });

  function alternar() {
    setColapsado((previo) => {
      const nuevo = !previo;
      window.localStorage.setItem(CLAVE_COLAPSADO, nuevo ? "1" : "0");
      return nuevo;
    });
  }

  return (
    <aside
      id={idPanel}
      aria-label="Navegación de mi cuenta"
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-ink-200 bg-paper-raised transition-[width] duration-200 lg:flex ${
        colapsado ? "w-16" : "w-60"
      }`}
    >
      <div className={`flex h-[57px] shrink-0 items-center border-b border-ink-200 ${colapsado ? "justify-center px-0" : "justify-between px-4"}`}>
        {!colapsado && (
          <div className="flex min-w-0 items-center gap-2">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- URL de Supabase Storage, no un dominio fijo conocido de antemano
              <img src={logoUrl} alt="" className="h-6 w-6 shrink-0 rounded object-contain" />
            )}
            <span className="truncate text-base font-semibold tracking-tight text-ink-900">Mi cuenta</span>
          </div>
        )}
        <button
          type="button"
          onClick={alternar}
          aria-expanded={!colapsado}
          aria-controls={idPanel}
          aria-label={colapsado ? "Expandir menú" : "Colapsar menú"}
          title={colapsado ? "Expandir menú" : "Colapsar menú"}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
            className={`transition-transform duration-200 ${colapsado ? "rotate-180" : ""}`}
          >
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2" aria-label="Secciones de mi cuenta">
        {ITEMS.map((item) => {
          const activo = esItemActivo(item.href, pathname);
          return (
            <div key={item.href} className="group/item relative">
              <Link
                href={item.href}
                aria-current={activo ? "page" : undefined}
                aria-label={item.etiqueta}
                title={colapsado ? item.etiqueta : undefined}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-1 ${
                  colapsado ? "justify-center px-0" : ""
                } ${activo ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-ink-100"}`}
              >
                {item.icono}
                {!colapsado && <span className="truncate">{item.etiqueta}</span>}
              </Link>
              {colapsado && (
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute left-full top-1/2 z-30 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-ink-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/item:opacity-100 group-focus-within/item:opacity-100"
                >
                  {item.etiqueta}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Identidad de la sesión + salir — siempre visible (no un dropdown
          como CuentaClienteMenu en el header público): el sidebar ya es
          persistente, no hace falta un trigger para revelarlo. */}
      <div className="border-t border-ink-200 p-2">
        {cliente && (
          <div
            className={`mb-1 flex items-center gap-2.5 py-2 ${colapsado ? "justify-center" : "px-1.5"}`}
            title={colapsado ? cliente.nombre : undefined}
          >
            <AvatarCliente nombre={cliente.nombre} avatarUrl={cliente.avatarUrl} logoTiendaUrl={logoUrl} size="md" />
            {!colapsado && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900">{cliente.nombre}</p>
                <p className="truncate text-xs text-ink-500">{cliente.email}</p>
              </div>
            )}
          </div>
        )}
        <BotonCerrarSesion saliendo={saliendo} onClick={salir} soloIcono={colapsado} />
      </div>
    </aside>
  );
}

// Mismo patrón que MenuMovilAdmin — nav horizontal simple por debajo de
// "lg", donde no entra el sidebar de arriba.
export function ClienteNavMovil() {
  const pathname = usePathname();
  // Mismo cierre de sesión que el sidebar de escritorio (ver ClienteNav) —
  // acá como pill circular ícono-solo al final de la barra (redondo), no
  // hay espacio para el texto en este layout horizontal.
  const { saliendo, salir } = useCerrarSesion({ endpoint: "/api/cliente/logout", redirectTo: "/cliente/login", origen: "ClienteNavMovil.salir" });
  return (
    <nav aria-label="Secciones de mi cuenta" className="flex items-center gap-1 overflow-x-auto border-b border-ink-200 bg-paper-raised px-2 py-2 lg:hidden">
      {ITEMS.map((item) => {
        const activo = esItemActivo(item.href, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={activo ? "page" : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
              activo ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-ink-100"
            }`}
          >
            {item.icono}
            {item.etiqueta}
          </Link>
        );
      })}
      <div className="ml-auto h-6 w-px shrink-0 bg-ink-200" aria-hidden="true" />
      <BotonCerrarSesion saliendo={saliendo} onClick={salir} redondo />
    </nav>
  );
}

function IconoCatalogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
      <path d="M3 7h18M3 12h18M3 17h18" strokeLinecap="round" />
    </svg>
  );
}

function IconoPedidos() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
      <path d="M9 3h6a1 1 0 0 1 1 1v1h2a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h2V4a1 1 0 0 1 1-1Z" />
      <path d="M9 12h6M9 16h6" strokeLinecap="round" />
    </svg>
  );
}

function IconoPerfil() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="shrink-0">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.4-3.4 4.4-5.5 7.5-5.5s6.1 2.1 7.5 5.5" strokeLinecap="round" />
    </svg>
  );
}
