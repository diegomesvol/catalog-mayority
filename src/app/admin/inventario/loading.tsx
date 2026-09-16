import { AdminHeader } from "@/components/admin/AdminHeader";

// Reproduce la forma real de InventarioAdmin (barra de filtros + tabla, sin
// las tarjetas KPI que se quitaron del panel) para cubrir la espera de
// leerCatalogoParaInventario() sin pantalla en blanco — mismo criterio que
// el resto de los loading.tsx.
export default function CargandoInventarioAdmin() {
  return (
    <AdminHeader>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8" aria-label="Cargando" role="status">
        <div className="flex flex-wrap gap-3">
          <div className="skeleton h-10 w-full max-w-xs rounded-lg" />
          <div className="skeleton h-10 w-32 rounded-lg" />
          <div className="skeleton h-10 w-32 rounded-lg" />
        </div>

        <div className="mt-5 rounded-xl border border-ink-200 p-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton mt-2 h-10 rounded-lg first:mt-0" />
          ))}
        </div>
      </main>
    </AdminHeader>
  );
}
