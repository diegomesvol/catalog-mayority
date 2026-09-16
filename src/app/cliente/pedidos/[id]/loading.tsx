// Skeleton del detalle de un pedido — misma forma que
// cliente/pedidos/[id]/page.tsx (volver, título+estado, descarga PDF,
// productos, comprador). Ver la nota grande en cliente/loading.tsx sobre
// por qué es solo el <main>.
export default function CargandoDetallePedidoCliente() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8" aria-label="Cargando pedido" role="status">
      <div className="skeleton h-4 w-24 rounded" />

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <div className="skeleton h-4 w-40 rounded" />
          <div className="skeleton h-3 w-28 rounded" />
        </div>
        <div className="skeleton h-5 w-24 shrink-0 rounded-full" />
      </div>

      <div className="skeleton mt-4 h-9 w-56 rounded-full" />

      <div className="mt-6 rounded-2xl border border-ink-200 bg-paper-raised p-4 sm:p-5">
        <div className="skeleton h-4 w-24 rounded" />
        <div className="mt-3 flex flex-col divide-y divide-ink-200">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex flex-col gap-1.5">
                <div className="skeleton h-3.5 w-48 rounded" />
                <div className="skeleton h-3 w-32 rounded" />
              </div>
              <div className="skeleton h-3.5 w-14 shrink-0 rounded" />
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-ink-200 pt-3">
          <div className="skeleton h-3 w-10 rounded" />
          <div className="skeleton h-4 w-20 rounded" />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-ink-200 bg-paper-raised p-4 sm:p-5">
        <div className="skeleton h-4 w-24 rounded" />
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-1.5">
              <div className="skeleton h-3 w-16 rounded" />
              <div className="skeleton h-3.5 w-24 rounded" />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
