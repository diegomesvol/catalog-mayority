"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { loginAdminSchema } from "@/lib/schemas/loginAdmin";
import { crearClienteNavegador } from "@/lib/supabaseNavegador";
import { destinoPostLogin } from "@/lib/destinoLogin";
import { AccesoNoAutorizado } from "@/components/ui/AccesoNoAutorizado";
import { IconoGoogle } from "./IconoGoogle";

type Errores = Partial<Record<"email" | "password", string>>;

// Mensajes que puede traer /admin/login?error=… — los deja el callback de
// OAuth (api/admin/auth/callback/route.ts) o el proxy (sesión revocada por
// acceso directo, ver proxy.ts) después de un redirect, así que se leen acá
// en vez de renderizarlos server-side (evita que quede pegado en la URL si
// el admin refresca). "sin_acceso" no es un toast — muestra la card de
// AccesoNoAutorizado (ver el efecto de abajo); solo "oauth" (falló el
// intercambio con Google, no es un tema de autorización) sigue siendo toast.
const MENSAJES_ERROR_OAUTH: Record<string, string> = {
  oauth: "No se pudo completar el ingreso con Google. Probá de nuevo.",
};

// Formulario de login — antes era toda la página (app/admin/login/page.tsx);
// se separó a un Client Component aparte porque la página ahora es un
// Server Component (necesita leer el fondo configurado vía leerConfigSitio,
// que no puede llamarse desde "use client") y porque este formulario
// necesita useSearchParams (?error=…), que en Next requiere un boundary de
// Suspense — ver ese "wrap" en page.tsx.
interface Props {
  // null tanto si no hay logo configurado como si logoVisible está apagado
  // (ver page.tsx) — un solo chequeo acá (!logoUrl) cubre los dos casos.
  logoUrl: string | null;
  razonSocial: string;
}

export function LoginAdminForm({ logoUrl, razonSocial }: Props) {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [cargando, setCargando] = useState(false);
  const [cargandoGoogle, setCargandoGoogle] = useState(false);
  // Presencia (no null) = mostrar la card en vez del formulario. El email es
  // opcional: se conoce si vino del login por password (submit de abajo),
  // pero no si vino de Google o de una sesión revocada por el proxy.
  const [accesoDenegado, setAccesoDenegado] = useState<{ email?: string } | null>(() =>
    searchParams.get("error") === "sin_acceso" ? {} : null,
  );
  // Se congela al montar: el efecto de ?error= limpia la URL (replaceState)
  // y con eso useSearchParams pierde el ?next= que dejó el proxy.
  const [destino] = useState(() => destinoPostLogin(searchParams.get("next"), "/admin"));

  useEffect(() => {
    const error = searchParams.get("error");
    if (!error) return;
    // Limpia el parámetro para que un refresh no vuelva a repetir la card/el
    // toast — igual criterio que PaginaInvitacion con el hash del token (no
    // debe quedar pegado en el historial del navegador).
    window.history.replaceState(null, "", window.location.pathname);
    // "sin_acceso" ya se resolvió en el estado inicial de accesoDenegado.
    if (error !== "sin_acceso" && MENSAJES_ERROR_OAUTH[error]) {
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
      const resp = await fetch("/api/admin/login", {
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
        if (data.requiereGoogle) {
          // Toast con acción directa — no tiene sentido bloquear al admin
          // con el mensaje y dejar que busque el botón de Google por su
          // cuenta más abajo.
          toast.error(data.mensaje, {
            duration: 10000,
            action: { label: "Continuar con Google", onClick: iniciarGoogle },
          });
        } else {
          toast.error(data.mensaje ?? "No se pudo iniciar sesión.");
        }
        setCargando(false);
        return;
      }
      toast.success("Sesión iniciada");
      // Navegación dura (no router.push/refresh): evita que la caché del
      // router del lado del cliente sirva una versión vieja de /admin, o que
      // push() y refresh() se pisen entre sí.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- intencional: navegación dura tras el login
      window.location.href = destino;
    } catch (err) {
      logError("LoginAdminForm.onSubmit", err, "No se pudo llegar al servidor — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo conectar con el servidor.");
      setCargando(false);
    }
  }

  async function iniciarGoogle() {
    setCargandoGoogle(true);
    try {
      const { error } = await crearClienteNavegador().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/api/admin/auth/callback` },
      });
      if (error) {
        logError("LoginAdminForm.iniciarGoogle", error);
        toast.error("No se pudo iniciar el ingreso con Google. Probá de nuevo.");
        setCargandoGoogle(false);
      }
      // Si no hubo error, el navegador ya está navegando hacia Google —
      // no hace falta (ni conviene) apagar cargandoGoogle acá.
    } catch (err) {
      logError("LoginAdminForm.iniciarGoogle", err, "No se pudo conectar con el servidor.");
      toast.error("No se pudo conectar con el servidor.");
      setCargandoGoogle(false);
    }
  }

  if (accesoDenegado) {
    return <AccesoNoAutorizado email={accesoDenegado.email} onReintentar={() => setAccesoDenegado(null)} />;
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/40 bg-paper-raised/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
      {/* Logo sin fondo propio (solo el isotipo) a la izquierda de
          título+subtítulo — alineación óptica: shrink-0 para que nunca lo
          aplaste el texto, y self-start (no center) porque un logo con
          texto interno de dos líneas (ej. "CALZADOS" + "MESVOL") pesa más
          arriba, así que alinearlo con la línea base del título en vez del
          centro del bloque completo se ve más prolijo. */}
      <div className="flex items-start gap-3">
        {logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element -- URL de Supabase Storage o externa (misma razón que fondoLoginUrl en page.tsx)
          <img src={logoUrl} alt={razonSocial} className="h-11 w-11 shrink-0 object-contain sm:h-12 sm:w-12" />
        )}
        <div className="min-w-0">
          <h1 className="text-lg font-semibold text-ink-900">Panel de administración</h1>
          <p className="mt-1 text-sm text-ink-500">Ingresá con tu cuenta de administrador.</p>
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

      {/* Mismo lugar y mismo tratamiento que LoginClienteForm.tsx: acceso
          directo al catálogo sin loguearse, discreto (ink-500) para no
          competir con "Ingresar" (el CTA principal, sólido en ink-900). */}
      <p className="mt-5 text-center text-sm text-ink-500">
        <Link
          href="/"
          className="font-medium underline-offset-2 hover:text-ink-900 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 rounded"
        >
          Volver al catálogo
        </Link>
      </p>
    </div>
  );
}
