// Skeleton de "Mi perfil" — misma forma que PerfilClienteForm (logo +
// campos de texto + métodos de pago + botón guardar). Ver la nota grande en
// cliente/loading.tsx sobre por qué es solo el <main>.
export default function CargandoPerfilCliente() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-8" aria-label="Cargando perfil" role="status">
      <div className="skeleton h-5 w-24 rounded" />
      <div className="skeleton mt-2 h-3 w-64 max-w-full rounded" />

      <div className="mt-6 flex flex-col gap-4">
        <div className="skeleton h-20 w-20 rounded-full" />

        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <div className="skeleton mb-1.5 h-3 w-20 rounded" />
            <div className="skeleton h-10 rounded-lg" />
          </div>
        ))}

        <div>
          <div className="skeleton mb-1.5 h-3 w-32 rounded" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="skeleton h-8 w-24 rounded-full" />
            ))}
          </div>
        </div>

        <div className="skeleton h-10 w-40 rounded-full" />
      </div>
    </main>
  );
}
