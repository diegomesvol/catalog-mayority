interface Props {
  soloIcono?: boolean;
}

// Acceso directo al catálogo público desde el panel admin — vive en el
// sidebar (desktop colapsado/expandido y drawer mobile, ver AdminNav y
// MenuMovilAdmin), justo encima de "Cerrar sesión". Estilo neutro (ink-500,
// la misma paleta gris que usaba el "Cerrar sesión" viejo) a propósito: no
// es una sección de gestión del panel, es una salida a mirar la tienda, así
// que no comparte el estilo de las secciones de NAV_ADMIN (bg-ink-900
// cuando están activas). target="_blank": no tiene sentido perder el lugar
// en el panel para mirar el catálogo.
export function VerCatalogoPublico({ soloIcono }: Props) {
  return (
    <a
      href="/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Ver catálogo público"
      title={soloIcono ? "Ver catálogo público" : undefined}
      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-1 ${
        soloIcono ? "justify-center px-0" : ""
      }`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true" className="shrink-0">
        <path d="M14 3h7v7M21 3l-9 9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {!soloIcono && <span className="truncate">Ver catálogo público</span>}
    </a>
  );
}
