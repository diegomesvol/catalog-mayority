// Card de "sin acceso" compartida entre el login de admin y el de cliente —
// mismo criterio de seguridad en los dos: nunca se distingue si el email no
// existe, está desactivado, o nunca fue invitado (evita que alguien pueda
// "probar" emails contra el sistema). Reemplaza el formulario en vez de un
// modal: ya estás en la pantalla de login, no hace falta un overlay para
// algo que no es destructivo — solo informar y dejar reintentar.
//
// Se usa en dos disparadores por portal (ver LoginAdminForm/LoginClienteForm):
// 1. La API de login (password) respondió { codigo: "SIN_ACCESO" }.
// 2. El proxy (middleware) redirigió acá con ?error=sin_acceso — pasa tanto
//    tras el callback de Google (api/admin/auth/callback) como al revocar
//    una sesión activa-pero-sin-acceso que intentó entrar por URL directa.

interface Props {
  email?: string;
  contactoAyuda?: string;
  onReintentar: () => void;
}

export function AccesoNoAutorizado({ email, contactoAyuda, onReintentar }: Props) {
  return (
    <div
      role="alert"
      className="w-full max-w-sm rounded-2xl border border-white/40 bg-paper-raised/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-ink-100">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5 text-ink-500">
          <path
            d="M12 15v2m-6 4h12a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2Zm10-10V7a4 4 0 0 0-8 0v2"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h1 className="mt-4 text-lg font-semibold text-ink-900">No tenés acceso activo</h1>
      <p className="mt-1.5 text-sm text-ink-500">
        {email ? (
          <>
            La cuenta <span className="font-medium text-ink-900">{email}</span> no tiene una invitación activa en el sistema.
          </>
        ) : (
          "Esta cuenta no tiene una invitación activa en el sistema."
        )}
      </p>

      <ul className="mt-4 space-y-2 border-t border-ink-200 pt-4 text-sm text-ink-500">
        <li className="flex gap-2.5">
          <span aria-hidden="true" className="mt-0.5 text-ink-300">
            —
          </span>
          Verificá que el correo ingresado (o seleccionado en Google) sea el correcto.
        </li>
        <li className="flex gap-2.5">
          <span aria-hidden="true" className="mt-0.5 text-ink-300">
            —
          </span>
          Si ya tenés una invitación pendiente, revisá tu correo (incluida la carpeta de spam).
        </li>
        <li className="flex gap-2.5">
          <span aria-hidden="true" className="mt-0.5 text-ink-300">
            —
          </span>
          {contactoAyuda ?? "Si el problema sigue, contactá al administrador para solicitar acceso."}
        </li>
      </ul>

      <button
        type="button"
        onClick={onReintentar}
        className="mt-6 w-full rounded-full border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-900 shadow-sm transition-colors hover:border-ink-300 hover:bg-ink-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
      >
        Volver a intentar
      </button>
    </div>
  );
}
