"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { registrarAvisoDemo } from "@/lib/apiCliente";

// Modal que se dispara cada vez que fetchJson detecta una respuesta 403 con
// `demo: true` (bloqueada por requierePermisoEscritura en lib/auth.ts) —
// cubre CUALQUIER intento de escritura del panel sin tener que tocar cada
// formulario/botón uno por uno, porque todos ya pasan por fetchJson (ver la
// nota grande ahí). Montado una sola vez en AdminHeader, que está presente
// en todas las páginas del panel.
export function AvisoModoDemo() {
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    registrarAvisoDemo(() => {
      // El toast de error normal del componente (ej. "No se pudieron
      // guardar las colecciones") va a disparar igual — se descarta acá
      // para que no compita visualmente con el modal, que es el aviso que
      // de verdad importa en este caso.
      toast.dismiss();
      setAbierto(true);
    });
    return () => registrarAvisoDemo(null);
  }, []);

  if (!abierto) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="aviso-demo-titulo"
      aria-describedby="aviso-demo-detalle"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/50 px-4"
    >
      <div className="w-full max-w-sm rounded-2xl bg-paper-raised p-6 text-center shadow-2xl">
        <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-warning-100 text-warning-600">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M12 9v4m0 4h.01M10.29 3.86l-8.18 14.18A2 2 0 0 0 3.82 21h16.36a2 2 0 0 0 1.71-3l-8.18-14.14a2 2 0 0 0-3.42 0z" />
          </svg>
        </span>
        <h2 id="aviso-demo-titulo" className="mt-3 text-base font-semibold text-ink-900">
          Modo demostración
        </h2>
        <p id="aviso-demo-detalle" className="mt-2 text-sm text-ink-700">
          Estás navegando con una cuenta de prueba — podés recorrer todo el panel, pero no se pueden guardar cambios
          ni modificar datos.
        </p>
        <button
          type="button"
          autoFocus
          onClick={() => setAbierto(false)}
          className="mt-5 w-full rounded-full bg-ink-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink-700"
        >
          Entendido
        </button>
      </div>
    </div>
  );
}
