"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { registrarInicioNavegacion } from "@/lib/navegacion";

// Overlay global de "navegando…" — montado una sola vez en app/layout.tsx
// (envuelto en su propio <Suspense>, ver esa nota) para que cubra TODA la
// app (catálogo, portal de cliente, admin) sin que cada árbol lo monte por
// su cuenta. Dos disparadores para "arrancó una transición de ruta":
//
// 1. Clicks en CUALQUIER <a href> interno del documento — un solo listener
//    acá adentro en vez de envolver cada <Link/> del sitio uno por uno (son
//    decenas, en Header/ClienteNav/AdminNav/MenuMovilCatalogo/etc). Se
//    filtran: click con botón/modificador distinto al normal (abrir en
//    pestaña nueva, etc.), target≠_self, download, hash-only (#ancla en la
//    misma página), links externos (otro origin) y el caso de que el href ya
//    apunte a la MISMA url actual (pathname+search) — ese último no es una
//    transición real.
// 2. iniciarNavegacion() (ver lib/navegacion.ts) para los pocos lugares que
//    navegan por código con router.push en vez de un <Link/> — el buscador
//    (Enter) y el redirect tras completar el onboarding del perfil.
//
// Se apaga solo cuando cambia pathname O searchParams — la señal real de
// "la transición ya llegó" — con un timeout de seguridad: si un click
// termina sin navegar de verdad (usuario canceló, error de red antes de que
// Next dispare el cambio de ruta), sin esto el overlay quedaría pegado a
// pantalla completa para siempre.
export function NavegacionOverlay() {
  const [pendiente, setPendiente] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    registrarInicioNavegacion(() => setPendiente(true));
    return () => registrarInicioNavegacion(null);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- se apaga a propósito con CUALQUIER cambio de pathname/searchParams, no depende de más nada
  useEffect(() => {
    setPendiente(false);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!pendiente) return;
    const timeout = window.setTimeout(() => setPendiente(false), 8000);
    return () => window.clearTimeout(timeout);
  }, [pendiente]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!anchor || anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      setPendiente(true);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-hidden={!pendiente}
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/10 backdrop-blur-[1px] transition-opacity duration-200 ${
        pendiente ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      <span className="sr-only">Cargando…</span>
      <svg
        width="36"
        height="36"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="animate-spin text-ink-900"
        aria-hidden="true"
      >
        <path d="M21 12a9 9 0 1 1-9-9" strokeLinecap="round" />
      </svg>
    </div>
  );
}
