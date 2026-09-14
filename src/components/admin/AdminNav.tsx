"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ADMIN, esItemActivo, itemsVisibles } from "@/lib/adminNav";
import type { RolAdmin } from "@/lib/auth";

// Navegación de escritorio — tabs horizontales, solo desde "lg" en adelante.
// Por debajo de "lg" (mobile y tablet) la navegación es MenuMovilAdmin (el
// drawer de hamburguesa) — mismo NAV_ADMIN, ver la nota ahí para por qué está
// compartido en vez de duplicado.
export function AdminNav({ rol }: { rol: RolAdmin | null }) {
  const pathname = usePathname();
  const items = itemsVisibles(NAV_ADMIN, rol);

  return (
    <nav className="mx-auto hidden max-w-3xl gap-1 px-4 sm:px-6 lg:flex" aria-label="Secciones del panel">
      {items.map((item) => {
        const activo = esItemActivo(item, pathname);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={activo ? "page" : undefined}
            className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              activo ? "border-ink-900 text-ink-900" : "border-transparent text-ink-500 hover:text-ink-900"
            }`}
          >
            {item.etiqueta}
          </Link>
        );
      })}
    </nav>
  );
}
