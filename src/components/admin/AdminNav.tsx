"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ADMIN, esItemActivo, itemsVisibles } from "@/lib/adminNav";
import type { RolAdmin } from "@/lib/auth";
import { IconoSeccionAdmin } from "./IconoSeccionAdmin";

const CLAVE_COLAPSADO = "admin-sidebar-colapsado";

// Sidebar vertical persistente de escritorio (desde "lg") — antes eran tabs
// horizontales, de ahí que el archivo se siga llamando "AdminNav.tsx" (es el
// único punto de import, en AdminHeader.tsx, así que no hizo falta
// renombrarlo). Por debajo de "lg" (mobile y tablet) la navegación sigue
// siendo el drawer de MenuMovilAdmin — mismo NAV_ADMIN en los dos, ver la
// nota ahí para por qué está compartido en vez de duplicado.
export function AdminNav({ rol }: { rol: RolAdmin | null }) {
  const pathname = usePathname();
  const items = itemsVisibles(NAV_ADMIN, rol);
  const idPanel = useId();

  // Colapsado/expandido, recordado entre navegaciones. No hay un layout
  // persistente por encima de las páginas del panel (cada una monta este
  // componente de nuevo — ver la nota grande en AdminHeader), así que sin
  // esto el sidebar volvería a expandirse solo con cada click a otra
  // sección. Arranca en `false` (expandido) para que el primer render en el
  // servidor y en el cliente coincidan (no hay localStorage en el server);
  // si el admin lo había colapsado antes, el efecto lo ajusta apenas monta
  // — el saltito de expandido a colapsado en esa primera pintura es el
  // costo aceptado a cambio de no tocar la arquitectura de rutas.
  const [colapsado, setColapsado] = useState(false);

  useEffect(() => {
    async function leerPreferencia() {
      await Promise.resolve();
      if (window.localStorage.getItem(CLAVE_COLAPSADO) === "1") setColapsado(true);
    }
    leerPreferencia();
  }, []);

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
      aria-label="Navegación del panel"
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-ink-200 bg-paper-raised transition-[width] duration-200 lg:flex ${
        colapsado ? "w-16" : "w-60"
      }`}
    >
      <div className={`flex h-[57px] shrink-0 items-center border-b border-ink-200 ${colapsado ? "justify-center px-0" : "justify-between px-4"}`}>
        {!colapsado && <span className="truncate text-base font-semibold tracking-tight text-ink-900">Panel admin</span>}
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

      {/* Sin "overflow-y-auto": NAV_ADMIN tiene solo 6 secciones fijas, que
          siempre entran de sobra en el alto del sidebar (h-screen) — no hace
          falta scroll interno. Ponerlo causaba un bug real: CSS fuerza
          overflow-x a "auto" en cuanto overflow-y no es "visible" (regla del
          spec de overflow), así que el tooltip del modo colapsado (que se
          posiciona por fuera de este <nav>, ver más abajo) quedaba
          clippeado/con scroll horizontal propio en vez de flotar limpio
          sobre el contenido — esa era la causa del scroll horizontal no
          deseado en el panel. */}
      <nav className="flex flex-1 flex-col gap-1 p-2" aria-label="Secciones del panel">
        {items.map((item) => {
          const activo = esItemActivo(item, pathname);
          return (
            // "group/item" + "relative": el tooltip (solo en colapsado) es
            // un <span> absoluto posicionado respecto de este contenedor, no
            // del propio Link — así no interfiere con su layout ni con el
            // área de click.
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
                <IconoSeccionAdmin id={item.icono} className="shrink-0" />
                {!colapsado && <span className="truncate">{item.etiqueta}</span>}
              </Link>

              {/* Tooltip propio (no el "title" nativo, que tarda en aparecer
                  y no responde a foco de teclado): visible con hover O con
                  foco, solo cuando el sidebar está colapsado (con texto
                  visible, el nombre de la sección ya está ahí al lado). Es
                  puramente decorativo para el usuario que ve — el nombre
                  accesible del link ya lo da aria-label de arriba, por eso
                  aria-hidden acá. */}
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
    </aside>
  );
}
