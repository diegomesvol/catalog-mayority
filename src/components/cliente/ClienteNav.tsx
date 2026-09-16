"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCerrarSesion } from "@/hooks/useCerrarSesion";
import { BotonCerrarSesion } from "@/components/ui/BotonCerrarSesion";

// Nav del portal de cliente — mismo espíritu que AdminNav (sidebar fijo
// desde "lg", ver esa nota grande) pero deliberadamente más simple: acá son
// 2 secciones fijas, nunca cambian según rol, así que no hace falta ni el
// array de configuración (lib/adminNav.ts) ni el colapsado/localStorage.
// "Catálogo" NO es un ítem más acá — vive aparte, en el pie del sidebar
// (VolverCatalogo, ver más abajo), mismo criterio que "Ver catálogo
// público" en AdminNav: es una salida, no una sección de gestión, así que
// no comparte peso visual con las de arriba.
const ITEMS = [
  { href: "/cliente", etiqueta: "Mis pedidos", icono: <IconoPedidos /> },
  { href: "/cliente/perfil", etiqueta: "Mi perfil", icono: <IconoPerfil /> },
] as const;

function esItemActivo(href: string, pathname: string): boolean {
  // "/cliente" no debe marcarse activo también para "/cliente/perfil" —
  // match exacto para esos dos, salvo pedidos/[id] que cuelga de "/cliente".
  if (href === "/cliente") return pathname === "/cliente" || pathname.startsWith("/cliente/pedidos");
  return pathname === href;
}

export function ClienteNav({ logoUrl = null }: { logoUrl?: string | null }) {
  const pathname = usePathname();
  // "Cerrar sesión" vivía en ClienteHeader (barra superior) — se movió al
  // pie del sidebar, mismo pedido que en el panel admin (ver AdminNav).
  const { saliendo, salir } = useCerrarSesion({ endpoint: "/api/cliente/logout", redirectTo: "/cliente/login", origen: "ClienteNav.salir" });

  return (
    <aside
      aria-label="Navegación de mi cuenta"
      className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-ink-200 bg-paper-raised lg:flex"
    >
      <div className="flex h-[57px] shrink-0 items-center gap-2 border-b border-ink-200 px-4">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- URL de Supabase Storage, no un dominio fijo conocido de antemano
          <img src={logoUrl} alt="" className="h-6 w-6 shrink-0 rounded object-contain" />
        )}
        <span className="truncate text-base font-semibold tracking-tight text-ink-900">Mi cuenta</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2" aria-label="Secciones de mi cuenta">
        {ITEMS.map((item) => {
          const activo = esItemActivo(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={activo ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-1 ${
                activo ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-ink-100"
              }`}
            >
              {item.icono}
              <span className="truncate">{item.etiqueta}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-1 border-t border-ink-200 p-2">
        <VolverCatalogo />
        <BotonCerrarSesion saliendo={saliendo} onClick={salir} />
      </div>
    </aside>
  );
}

// Mismo patrón que MenuMovilAdmin — nav horizontal simple por debajo de
// "lg", donde no entra el sidebar de arriba. 3 items alcanzan sin necesitar
// un drawer aparte (a diferencia del panel admin, con 6 secciones).
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
      <VolverCatalogoMovil />
      <BotonCerrarSesion saliendo={saliendo} onClick={salir} redondo />
    </nav>
  );
}

// Acceso a "volver al catálogo" — mismo criterio que VerCatalogoPublico en
// el panel admin (acción de salida, separada visualmente de las secciones
// de gestión, no un tab más de ITEMS) pero navegación normal, sin
// target="_blank": acá es "volver", no "espiar sin perder el lugar" como en
// el panel admin.
function VolverCatalogo() {
  return (
    <Link
      href="/"
      aria-label="Volver al catálogo"
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-1"
    >
      <IconoCatalogo />
      <span className="truncate">Volver al catálogo</span>
    </Link>
  );
}

// Misma acción que VolverCatalogo, versión ícono-solo para la barra
// horizontal mobile (mismo criterio que el BotonCerrarSesion "redondo" de
// al lado) — no hay espacio para el texto en este layout.
function VolverCatalogoMovil() {
  return (
    <Link
      href="/"
      aria-label="Volver al catálogo"
      title="Volver al catálogo"
      className="flex shrink-0 items-center justify-center rounded-full p-2 text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-1"
    >
      <IconoCatalogo />
    </Link>
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
