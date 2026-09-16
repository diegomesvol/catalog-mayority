"use client";

import { useEffect } from "react";

/**
 * Bloquea el scroll del body mientras `activo` es true — para drawers/modales
 * a pantalla completa en mobile (ej. MenuMovilAdmin), donde sin esto el
 * contenido de atrás se desplaza junto con el dedo aunque el panel tape la
 * pantalla. Restaura el valor previo de overflow al desactivarse/desmontar,
 * en vez de asumir "" — si en el futuro otro efecto ya lo había tocado, no lo
 * pisa.
 */
export function useBloqueoScroll(activo: boolean) {
  useEffect(() => {
    if (!activo) return;
    const overflowPrevio = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflowPrevio;
    };
  }, [activo]);
}
