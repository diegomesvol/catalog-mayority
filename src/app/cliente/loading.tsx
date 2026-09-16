// Skeleton de "Mis pedidos" — mismo criterio que el resto de los
// loading.tsx del proyecto (ver admin/catalogo/loading.tsx): reproduce la
// forma real de cliente/page.tsx para que no haya salto de layout. Solo el
// <main> — el sidebar/Header ya están resueltos por app/cliente/layout.tsx,
// que NO se re-pinta acá (Next solo swapea el slot de children mientras
// este fallback está activo).
export default function CargandoPedidosCliente() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8" aria-label="Cargando pedidos" role="status">
      <div className="mb-6">
        <div className="skeleton h-4 w-32 rounded" />
        <div className="skeleton mt-1.5 h-3 w-24 rounded" />
      </div>

      <div className="skeleton mb-4 h-4 w-40 rounded" />

      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-ink-200 bg-paper-raised p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-1.5">
                <div className="skeleton h-4 w-28 rounded" />
                <div className="skeleton h-3 w-20 rounded" />
              </div>
              <div className="skeleton h-5 w-20 shrink-0 rounded-full" />
            </div>
            <div className="mt-3 flex flex-col gap-1.5 border-t border-ink-200 pt-3">
              <div className="skeleton h-3 w-full rounded" />
              <div className="skeleton h-3 w-4/5 rounded" />
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-ink-200 pt-3">
              <div className="skeleton h-3 w-12 rounded" />
              <div className="skeleton h-4 w-16 rounded" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
