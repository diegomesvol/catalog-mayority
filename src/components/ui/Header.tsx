import Link from "next/link";
import { CarritoBoton } from "@/components/carrito/CarritoBoton";
import { BuscadorNavbar } from "./BuscadorNavbar";
import { DescargaOffline } from "./DescargaOffline";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-ink-200 bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/70">
      {/* En mobile (base) el logo y las acciones van en columnas "auto": cada
          una ocupa exactamente el ancho de su contenido y nunca se comprime
          por debajo de eso, así que nunca terminan solapadas — el buscador
          es la única columna flexible (minmax(0,1fr)) y es la que cede
          ancho cuando el espacio escasea (ej. el botón de descarga mostrando
          además el de cancelar mientras descarga, o el badge del carrito).
          Antes las 3 columnas eran fraccionales con un piso fijo en la del
          medio: el piso "protegía" al buscador pero no a sus vecinas — sus
          botones (shrink-0) no se achicaban y su contenido terminaba
          pintándose encima del buscador en vez de simplemente recortarse.
          Desde `sm` ya hay ancho de sobra para el patrón simétrico (fr/fr/fr
          con piso en la columna central), que centra el buscador de verdad
          (equidistante de los dos bordes) en vez de "lo que sobre después
          del logo". */}
      <div className="mx-auto grid max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(140px,280px)_minmax(0,1fr)] sm:gap-3 sm:px-6">
        {/* En mobile el logo se acorta ("Catálogo") para dejarle ancho
            usable al buscador — a partir de sm ya entra completo. */}
        <div className="min-w-0 justify-self-start">
          <Link href="/" className="shrink-0 text-base font-semibold tracking-tight text-ink-900">
            <span className="sm:hidden">Catálogo</span>
            <span className="hidden sm:inline">Catálogo Mayorista</span>
          </Link>
        </div>
        <BuscadorNavbar />
        <div className="flex min-w-0 items-center justify-self-end gap-1 sm:gap-2">
          <DescargaOffline />
          <CarritoBoton />
        </div>
      </div>
    </header>
  );
}
