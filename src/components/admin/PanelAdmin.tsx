"use client";

import { useState } from "react";
import { CargadorCatalogo } from "./CargadorCatalogo";
import { RevertirRespaldo } from "./RevertirRespaldo";
import { DescargarArchivoOriginal } from "./DescargarArchivoOriginal";

// "Reemplazar catálogo" y "Revertir al respaldo" escriben el mismo archivo
// (catalogo.json) en Vercel Blob. La protección real ahora es un candado
// del lado del servidor (ver /api/admin/confirm, /api/admin/revert y
// lib/catalogoLock.ts) que cubre a cualquier sesión admin, no solo esta
// pestaña.
//
// Esta pieza además comparte un estado entre ambos botones: mientras uno
// está en curso, el otro queda deshabilitado acá mismo — evita el
// round-trip al servidor (y el toast de "otra operación en curso") para
// el caso común de un solo admin haciendo doble clic o repitiendo la
// acción sin esperar.
export function PanelAdmin() {
  const [operacionCriticaEnCurso, setOperacionCriticaEnCurso] = useState(false);

  return (
    <>
      <CargadorCatalogo
        bloqueadoPorOtraOperacion={operacionCriticaEnCurso}
        onOperacionCriticaChange={setOperacionCriticaEnCurso}
      />
      <RevertirRespaldo
        bloqueadoPorOtraOperacion={operacionCriticaEnCurso}
        onOperacionCriticaChange={setOperacionCriticaEnCurso}
      />
      <DescargarArchivoOriginal />
    </>
  );
}
