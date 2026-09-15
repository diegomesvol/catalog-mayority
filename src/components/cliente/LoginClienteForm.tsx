"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { loginAdminSchema } from "@/lib/schemas/loginAdmin";
import { crearClienteNavegador } from "@/lib/supabaseNavegador";
import { AccesoNoAutorizado } from "@/components/ui/AccesoNoAutorizado";
import { IconoGoogle } from "@/components/admin/IconoGoogle";

// Mismo look que LoginAdminForm.tsx (misma card, mismos estilos de input,
// mismo botón de Google) a propósito — portal visualmente unificado. El
// backend de password sigue separado (login contra /api/cliente/login, no
// /api/admin/login), y Google ahora también: el callback vive en
// api/cliente/auth/callback (no el de admin) para que el intercambio de
// sesión valide contra `clientes`, no contra admin_perfiles — ver la nota
// en clienteAuth.ts sobre por qué los dos árboles de sesión quedaron
// aparte. Mismo esquema de validación que el de admin (email + password)
// para el form — no hay nada específico de "cliente" en esa forma.
const MENSAJES_ERROR_OAUTH: Record<string, string> = {
  oauth: "No se pudo completar el ingreso con Google. Probá de nuevo.",
};

type Errores = Partial<Record<"email" | "password", string>>;

interface Props {
  // Mismo contrato que LoginAdminForm — ver la nota ahí.
  logoUrl: string | null;
  razonSocial: string;
}

export function LoginClienteForm({ logoUrl, razonSocial }: Props) {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [cargando, setCargando] = useState(false);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);
  // Mismo criterio que LoginAdminForm: presencia (no null) = mostrar la card
  // en vez del formulario. Llega por ?error=sin_acceso cuando el proxy
  // revoca una sesión activa-pero-sin-acceso al entrar por URL directa (ver
  // proxy.ts), o cuando vuelve del callback de Google sin fila en
  // `clientes` (mismo motivo que el disparador del submit de abajo, con
  // email conocido).
  const [accesoDenegado, setAccesoDenegado] = useState<{ email?: string } | null>(null);

  useEffect(() => {
    const error = searchParams.get("error");
    if (!error) return;
    window.history.replaceState(null, "", window.location.pathname);
    if (error === "sin_acceso") {
      setAccesoDenegado({});
    } else if (MENSAJES_ERROR_OAUTH[error]) {
      toast.error(MENSAJES_ERROR_OAUTH[error]);
    }
  }, [searchParams]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    const resultado = loginAdminSchema.safeParse({ email, password });
    if (!resultado.success) {
      const nuevosErrores: Errores = {};
      for (const issue of resultado.error.issues) {
        const campo = issue.path[0] as keyof Errores;
        if (!nuevosErrores[campo]) nuevosErrores[campo] = issue.message;
      }
      setErrores(nuevosErrores);
      return;
    }

    setErrores({});
    setCargando(true);
    try {
      const resp = await fetch("/api/cliente/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resultado.data),
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        if (data.codigo === "SIN_ACCESO") {
          setAccesoDenegado({ email });
          setCargando(false);
          return;
        }
        toast.error(data.mensaje ?? "No se pudo iniciar sesión.");
        setCargando(false);
        return;
      }
      toast.success("Sesión iniciada");
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intencional: navegación dura tras el login
      window.location.href = "/cliente";
    } catch (err) {
      logError("LoginClienteForm.onSubmit", err, "No se pudo llegar al servidor — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo conectar con el servidor.");
      setCargando(false);
    }
  }

  async function iniciarGoogle() {
    setCargandoGoogle(true);
    try {
      const { error } = await crearClienteNavegador().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/api/cliente/auth/callback` },
      });
      if (error) {
        logError("LoginClienteForm.iniciarGoogle", error);
        toast.error("No se pudo iniciar el ingreso con Google. Probá de nuevo.");
        setCargandoGoogle(false);
      }
      // Si no hubo error, el navegador ya está navegando hacia Google — no
      // hace falta (ni conviene) apagar cargandoGoogle acá.
    } catch (err) {
      logError("LoginClienteForm.iniciarGoogle", err, "No se pudo conectar con el servidor.");
      toast.error("No se pudo conectar con el servidor.");
      setCargandoGoogle(false);
    }
  }

  if (accesoDenegado) {
    return <AccesoNoAutorizado email={accesoDenegado.email} onReintentar={() => setAccesoDenegado(null)} />;
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/40 bg-paper-raised/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
      {/* Mismo tratamiento que LoginAdminForm: logo sin fondo propio a la
          izquierda del título+subtítulo, alineado a la línea base del
          título (self-start, no center) — ver la nota ahí. */}
      <div className="flex items-start gap-3">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- URL de Supabase Storage o externa (misma razón que fondoLoginUrl en page.tsx)
          <img src={logoUrl} alt={razonSocial} className="h-11 w-11 shrink-0 object-contain sm:h-12 sm:w-12" />
        )}
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-ink-900">Panel de cliente mayorista</h1>
          <p className="mt-1 text-sm text-ink-500">Ingresá con tu cuenta de mayorista.</p>
        </div>
      </div>

      <button
        type="button"
        onClick={iniciarGoogle}
        disabled={cargandoGoogle || cargando}
        className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-full border border-ink-200 bg-white px-4 py-2.5 text-sm font-medium text-ink-900 shadow-sm transition-colors hover:border-ink-300 hover:bg-ink-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <IconoGoogle />
        {cargandoGoogle ? "Conectando…" : "Continuar con Google"}
      </button>

      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <div className="h-px flex-1 bg-ink-200" />
        <span className="text-xs font-medium text-ink-500">o con credenciales</span>
        <div className="h-px flex-1 bg-ink-200" />
      </div>

      <form onSubmit={onSubmit} noValidate>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink-900">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoFocus
          autoComplete="username"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(errores.email)}
          aria-describedby={errores.email ? "email-error" : undefined}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 ${
            errores.email ? "border-danger-600" : "border-ink-200 focus:border-accent-600"
          }`}
        />
        {errores.email && (
          <p id="email-error" className="mt-1 text-xs text-danger-600">
            {errores.email}
          </p>
        )}

        <label htmlFor="password" className="mt-4 mb-1.5 block text-sm font-medium text-ink-900">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-invalid={Boolean(errores.password)}
          aria-describedby={errores.password ? "password-error" : undefined}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 ${
            errores.password ? "border-danger-600" : "border-ink-200 focus:border-accent-600"
          }`}
        />
        {errores.password && (
          <p id="password-error" className="mt-1 text-xs text-danger-600">
            {errores.password}
          </p>
        )}

        <button
          type="submit"
          disabled={cargando || cargandoGoogle}
          className="mt-5 w-full rounded-full bg-ink-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink-700 active:bg-ink-900/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cargando ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
