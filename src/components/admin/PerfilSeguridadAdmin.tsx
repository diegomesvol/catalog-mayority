"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { definirPasswordSchema } from "@/lib/schemas/definirPassword";
import { crearClienteNavegador } from "@/lib/supabaseNavegador";

type Errores = Partial<Record<"password" | "confirmar", string>>;

// Le permite al admin YA LOGUEADO asignarse o cambiarse una contraseña
// propia — pensado sobre todo para quien entró con Google y nunca tuvo una
// (ver el toast de /admin/login cuando intenta entrar con clave sin tener
// una asignada, que linkea justo acá), pero sirve igual para cualquier
// admin que quiera cambiar la suya. Mismo esquema (definirPasswordSchema) y
// misma llamada (auth.updateUser) que ya usa PaginaInvitacion — la
// diferencia es que acá NO hace falta procesar ningún token de la URL: ya
// hay una sesión válida (por eso este formulario vive detrás del login, en
// /admin/configuracion).
export function PerfilSeguridadAdmin() {
  const [password, setPassword] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);

  function campo(clave: keyof Errores, valor: string) {
    if (clave === "password") setPassword(valor);
    else setConfirmar(valor);
    if (errores[clave]) setErrores({ ...errores, [clave]: undefined });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const resultado = definirPasswordSchema.safeParse({ password, confirmar });
    if (!resultado.success) {
      const nuevosErrores: Errores = {};
      for (const issue of resultado.error.issues) {
        const campoConError = issue.path[0] as keyof Errores;
        if (!nuevosErrores[campoConError]) nuevosErrores[campoConError] = issue.message;
      }
      setErrores(nuevosErrores);
      return;
    }

    setErrores({});
    setGuardando(true);
    try {
      const { error } = await crearClienteNavegador().auth.updateUser({ password: resultado.data.password });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Contraseña actualizada — ya podés usarla para ingresar con tu email.");
      setPassword("");
      setConfirmar("");
    } catch (err) {
      logError("PerfilSeguridadAdmin.onSubmit", err, "No se pudo conectar con el servidor — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-ink-200 p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-ink-900">Contraseña</h2>
      <p className="mt-1 text-xs text-ink-500">
        Asigná o cambiá tu contraseña de acceso. Si hasta ahora solo ingresaste con Google, definí una acá para poder
        entrar también con tu email y clave.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-4 flex flex-col gap-3">
        <div>
          <label htmlFor="perfil-password" className="mb-1.5 block text-xs font-medium text-ink-900">
            Nueva contraseña
          </label>
          <input
            id="perfil-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => campo("password", e.target.value)}
            aria-invalid={Boolean(errores.password)}
            aria-describedby={errores.password ? "perfil-password-error" : "perfil-password-ayuda"}
            className={`w-full rounded-lg border bg-paper px-3 py-2 text-sm text-ink-900 focus:border-accent-600 ${
              errores.password ? "border-danger-600" : "border-ink-200"
            }`}
          />
          {errores.password ? (
            <p id="perfil-password-error" className="mt-1 text-xs text-danger-600">
              {errores.password}
            </p>
          ) : (
            <p id="perfil-password-ayuda" className="mt-1 text-[11px] text-ink-500">
              Mínimo 8 caracteres, con mayúscula, minúscula, número y símbolo.
            </p>
          )}
        </div>

        <div>
          <label htmlFor="perfil-confirmar" className="mb-1.5 block text-xs font-medium text-ink-900">
            Confirmar contraseña
          </label>
          <input
            id="perfil-confirmar"
            type="password"
            autoComplete="new-password"
            value={confirmar}
            onChange={(e) => campo("confirmar", e.target.value)}
            aria-invalid={Boolean(errores.confirmar)}
            aria-describedby={errores.confirmar ? "perfil-confirmar-error" : undefined}
            className={`w-full rounded-lg border bg-paper px-3 py-2 text-sm text-ink-900 focus:border-accent-600 ${
              errores.confirmar ? "border-danger-600" : "border-ink-200"
            }`}
          />
          {errores.confirmar && (
            <p id="perfil-confirmar-error" className="mt-1 text-xs text-danger-600">
              {errores.confirmar}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={guardando}
          className="mt-1 self-start rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar contraseña"}
        </button>
      </form>
    </div>
  );
}
