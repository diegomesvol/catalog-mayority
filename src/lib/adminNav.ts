// Config única de las secciones del panel admin — la comparten el nav de
// escritorio (AdminNav, tabs horizontales) y el menú móvil (MenuMovilAdmin,
// drawer con hamburguesa) para que agregar/quitar una sección no signifique
// tocar dos listas por separado.
//
// `rolesPermitidos` es el gancho para accesos según el rol (pedido explícito
// de escalabilidad): hoy ninguna sección lo usa — cualquier admin activo (incl.
// editor y demo) ve las 6 — pero agregar una sección solo visible para cierto
// rol es tan simple como sumarle ese campo; itemsVisibles ya lo filtra.
// `submenu` es el mismo gancho para secciones con subitems el día que haga
// falta (ninguna lo usa todavía).

import type { RolAdmin } from "./auth";

export interface ItemNavAdmin {
  href: string;
  etiqueta: string;
  rolesPermitidos?: RolAdmin[];
  submenu?: ItemNavAdmin[];
}

export const NAV_ADMIN: ItemNavAdmin[] = [
  { href: "/admin", etiqueta: "Dashboard" },
  { href: "/admin/catalogo", etiqueta: "Catálogo" },
  { href: "/admin/colecciones", etiqueta: "Colecciones" },
  { href: "/admin/clientes", etiqueta: "Clientes" },
  { href: "/admin/pedidos", etiqueta: "Pedidos" },
  { href: "/admin/configuracion", etiqueta: "Configuración" },
];

/** Filtra por rol — sin perfil (todavía no cargó) se muestran todas, nunca
 * un panel vacío mientras se resuelve /api/admin/me. */
export function itemsVisibles(items: ItemNavAdmin[], rol: RolAdmin | null): ItemNavAdmin[] {
  if (!rol) return items;
  return items.filter((item) => !item.rolesPermitidos || item.rolesPermitidos.includes(rol));
}

/** Mismo criterio de "activo" que usaba AdminNav: exacto para "/admin",
 * prefijo para el resto (para que /admin/catalogo/algo siga marcando
 * "Catálogo" como activo). */
export function esItemActivo(item: ItemNavAdmin, pathname: string): boolean {
  return item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
}
