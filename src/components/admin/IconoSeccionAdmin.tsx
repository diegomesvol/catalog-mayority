export type IdIconoAdmin = "dashboard" | "catalogo" | "inventario" | "colecciones" | "clientes" | "pedidos" | "configuracion";

interface Props {
  id: IdIconoAdmin;
  className?: string;
}

// Un ícono por sección del panel — mismo lenguaje visual que el resto de la
// app (trazo, sin relleno). Centralizado ACÁ para que agregar una sección
// nueva sea nada más: 1) sumar su id acá con su SVG, 2) referenciarlo en
// NAV_ADMIN (lib/adminNav.ts). Ni SidebarAdmin (antes AdminNav, ver ese
// archivo) ni MenuMovilAdmin necesitan saber nada de SVGs — ambos ya
// comparten NAV_ADMIN y ahora comparten también este set de íconos, en vez
// de cada uno definiendo el suyo.
export function IconoSeccionAdmin({ id, className }: Props) {
  const comun = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none" as const,
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true as const,
    className,
  };

  switch (id) {
    case "dashboard":
      return (
        <svg {...comun}>
          <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="1.5" />
          <rect x="13" y="3.5" width="7.5" height="4.5" rx="1.5" />
          <rect x="13" y="10" width="7.5" height="10.5" rx="1.5" />
          <rect x="3.5" y="13" width="7.5" height="7.5" rx="1.5" />
        </svg>
      );
    case "catalogo":
      return (
        <svg {...comun}>
          <path d="M21 7.5 12 3 3 7.5l9 4.5 9-4.5Z" />
          <path d="M3 7.5v9l9 4.5 9-4.5v-9" />
          <path d="M12 12v9" />
        </svg>
      );
    case "inventario":
      return (
        <svg {...comun}>
          <path d="M3.5 7.5 12 3l8.5 4.5-8.5 4.5-8.5-4.5Z" />
          <path d="M4.5 9.75V16c0 .5.28.96.73 1.19L11.3 20.6a1.5 1.5 0 0 0 1.4 0l6.07-3.41c.45-.23.73-.7.73-1.19V9.75" />
          <line x1="12" y1="12" x2="12" y2="20.75" />
        </svg>
      );
    case "colecciones":
      return (
        <svg {...comun}>
          <path d="M12 3 3 8l9 5 9-5-9-5Z" />
          <path d="M3 16l9 5 9-5" />
          <path d="M3 12l9 5 9-5" />
        </svg>
      );
    case "clientes":
      return (
        <svg {...comun}>
          <circle cx="9" cy="8" r="3.25" />
          <path d="M3 20c0-3.45 2.69-6.25 6-6.25s6 2.8 6 6.25" />
          <circle cx="17" cy="8.5" r="2.5" />
          <path d="M15.7 14.3c2.45.5 4.3 2.7 4.3 5.35" />
        </svg>
      );
    case "pedidos":
      return (
        <svg {...comun}>
          <path d="M6.5 8h11l-1 12h-9l-1-12Z" />
          <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
        </svg>
      );
    case "configuracion":
      return (
        <svg {...comun}>
          <line x1="4" y1="6" x2="20" y2="6" />
          <circle cx="9" cy="6" r="2" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <circle cx="15" cy="12" r="2" />
          <line x1="4" y1="18" x2="20" y2="18" />
          <circle cx="9" cy="18" r="2" />
        </svg>
      );
  }
}
