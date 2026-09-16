interface Props {
  saliendo: boolean;
  onClick: () => void;
  /** Sidebar admin colapsado (ver AdminNav): sin espacio para texto, ícono solo. */
  soloIcono?: boolean;
  /** Barra horizontal mobile (ver ClienteNavMovil): pill circular ícono-solo,
   * en vez del rectángulo del sidebar vertical. Implica soloIcono. */
  redondo?: boolean;
}

function IconoSalir() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true" className="shrink-0">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// Botón de "Cerrar sesión" compartido por los 4 sidebars donde vive (admin
// desktop/mobile, cliente desktop/mobile) — mismo look en los cuatro:
// ícono + texto en rojo (nunca el ink-700 del resto de la navegación, para
// que se lea como la única acción destructiva/de salida del menú). Los dos
// contextos compactos (sidebar admin colapsado, barra mobile del portal de
// cliente) muestran solo el ícono; aria-label cubre el nombre accesible
// cuando el texto no se pinta.
export function BotonCerrarSesion({ saliendo, onClick, soloIcono, redondo }: Props) {
  const icono = soloIcono || redondo;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={saliendo}
      aria-label="Cerrar sesión"
      title={icono ? "Cerrar sesión" : undefined}
      className={`flex shrink-0 items-center gap-2.5 text-sm font-medium text-danger-600 transition-colors hover:bg-danger-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 ${
        redondo ? "justify-center rounded-full p-2" : `w-full rounded-lg px-3 py-2.5 ${icono ? "justify-center px-0" : ""}`
      }`}
    >
      <IconoSalir />
      {!icono && <span className="truncate">{saliendo ? "Saliendo…" : "Cerrar sesión"}</span>}
    </button>
  );
}
