"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Nav del portal de cliente — mismo espíritu que AdminNav (sidebar fijo
// desde "lg", ver esa nota grande) pero deliberadamente más simple: acá son
// 3 secciones fijas, nunca cambian según rol, así que no hace falta ni el
// array de configuración (lib/adminNav.ts) ni el colapsado/localStorage.
const ITEMS = [
  { href: "/", etiqueta: "Catálogo", icono: <IconoCatalogo /> },
  { href: "/cliente", etiqueta: "Mis pedidos", icono: <IconoPedidos /> },
  { href: "/cliente/perfil", etiqueta: "Mi perfil", icono: <IconoPerfil /> },
] as const;

function esItemActivo(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  // "/cliente" no debe marcarse activo también para "/cliente/perfil" —
  // match exacto para esos dos, salvo pedidos/[id] que cuelga de "/cliente".
  if (href === "/cliente") return pathname === "/cliente" || pathname.startsWith("/cliente/pedidos");
  return pathname === href;
}

export function ClienteNav() {
  const pathname = usePathname();

  return (
    <aside
      aria-label="Navegación de mi cuenta"
      className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-ink-200 bg-paper-raised lg:flex"
    >
      <div className="flex h-[57px] shrink-0 items-center border-b border-ink-200 px-4">
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
    </aside>
  );
}

// Mismo patrón que MenuMovilAdmin — nav horizontal simple por debajo de
// "lg", donde no entra el sidebar de arriba. 3 items alcanzan sin necesitar
// un drawer aparte (a diferencia del panel admin, con 6 secciones).
export function ClienteNavMovil() {
  const pathname = usePathname();
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
