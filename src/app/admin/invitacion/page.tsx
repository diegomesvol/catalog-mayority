"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { crearClienteNavegador } from "@/lib/supabase";
import { definirPasswordSchema } from "@/lib/schemas/definirPassword";
import { logError } from "@/lib/logger";

// Destino del link de invitación/recuperación de contraseña de Supabase
// (Site URL en Authentication -> URL Configuration debe apuntar acá). Ambos
// flujos entregan la sesión en el fragmento de la URL (#access_token=...),
// solo legible del lado del navegador — por eso todo esto corre en cliente.
type Estado = "verificando" | "listo" | "invalido" | "guardando";
type Errores = Partial<Record<"password" | "confirmar", string>>;

export default function PaginaInvitacion() {
  const [estado, setEstado] = useState<Estado>("verificando");
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [errores, setErrores] = useState<Errores>({});

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const errorDescripcion = hash.get("error_description");
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");

    // Se limpia el hash apenas se lee — el token no debe quedar visible ni
    // guardado en el historial del navegador.
    window.history.replaceState(null, "", window.location.pathname);

    if (errorDescripcion) {
      setMensajeError(decodeURIComponent(errorDescripcion.replace(/\+/g, " ")));
      setEstado("invalido");
      return;
    }
    if (!accessToken || !refreshToken) {
      setMensajeError("Este link no es válido. Pedí que te reenvíen la invitación.");
      setEstado("invalido");
      return;
    }

    crearClienteNavegador()
      .auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          logError("PaginaInvitacion.setSession", error);
          setMensajeError("El link expiró o ya se usó. Pedí que te reenvíen la invitación.");
          setEstado("invalido");
          return;
        }
        setEstado("listo");
      });
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const resultado = definirPasswordSchema.safeParse({ password, confirmar });
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
    setEstado("guardando");

    try {
      const { error } = await crearClienteNavegador().auth.updateUser({ password: resultado.data.password });
      if (error) {
        toast.error(error.message);
        setEstado("listo");
        return;
      }
      toast.success("Contraseña definida. Ingresando…");
      // Navegación dura: la sesión ya quedó en cookies (setSession la
      // sincronizó), el proxy server-side la valida en el siguiente request.
      window.location.href = "/admin";
    } catch (err) {
      logError("PaginaInvitacion.onSubmit", err);
      toast.error("No se pudo guardar la contraseña. Probá de nuevo.");
      setEstado("listo");
    }
  }

  if (estado === "verificando") {
    return (
      <main className="flex min-h-screen flex-1 items-center justify-center bg-paper px-4">
        <p className="text-sm text-ink-500">Verificando invitación…</p>
      </main>
    );
  }

  if (estado === "invalido") {
    return (
      <main className="flex min-h-screen flex-1 items-center justify-center bg-paper px-4">
        <div className="w-full max-w-sm rounded-2xl border border-danger-600/30 bg-paper-raised p-6 text-center sm:p-8">
          <h1 className="text-base font-semibold text-danger-600">Link inválido</h1>
          <p className="mt-2 text-sm text-ink-700">{mensajeError}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-1 items-center justify-center bg-paper px-4">
      <form
        onSubmit={onSubmit}
        noValidate
        className="w-full max-w-sm rounded-2xl border border-ink-200 bg-paper-raised p-6 shadow-sm sm:p-8"
      >
        <h1 className="text-lg font-semibold text-ink-900">Definí tu contraseña</h1>
        <p className="mt-1 text-sm text-ink-500">Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo.</p>

        <label htmlFor="password" className="mt-6 mb-1.5 block text-sm font-medium text-ink-900">
          Nueva contraseña
        </label>
        <input
          id="password"
          type="password"
          autoFocus
          autoComplete="new-password"
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

        <label htmlFor="confirmar" className="mt-4 mb-1.5 block text-sm font-medium text-ink-900">
          Confirmar contraseña
        </label>
        <input
          id="confirmar"
          type="password"
          autoComplete="new-password"
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          aria-invalid={Boolean(errores.confirmar)}
          aria-describedby={errores.confirmar ? "confirmar-error" : undefined}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 ${
            errores.confirmar ? "border-danger-600" : "border-ink-200 focus:border-accent-600"
          }`}
        />
        {errores.confirmar && (
          <p id="confirmar-error" className="mt-1 text-xs text-danger-600">
            {errores.confirmar}
          </p>
        )}

        <button
          type="submit"
          disabled={estado === "guardando"}
          className="mt-5 w-full rounded-full bg-ink-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink-700 active:bg-ink-900/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {estado === "guardando" ? "Guardando…" : "Guardar y entrar"}
        </button>
      </form>
    </main>
  );
}
