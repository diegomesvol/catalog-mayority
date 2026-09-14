"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { loginAdminSchema } from "@/lib/schemas/loginAdmin";

// Mismo look que LoginAdminForm.tsx (misma card, mismos estilos de input)
// a propósito — portal visualmente unificado, aunque el backend sigue
// separado (login por password contra /api/cliente/login, sin Google: ver
// la nota en clienteAuth.ts sobre por qué los dos árboles de sesión
// quedaron aparte). Mismo esquema de validación que el de admin (email +
// password) — no hay nada específico de "cliente" en la forma.
type Errores = Partial<Record<"email" | "password", string>>;

export function LoginClienteForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errores, setErrores] = useState<Errores>({});
  const [cargando, setCargando] = useState(false);

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

  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/40 bg-paper-raised/90 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
      <h1 className="text-lg font-semibold text-ink-900">Mi cuenta</h1>
      <p className="mt-1 text-sm text-ink-500">Ingresá con tu cuenta de mayorista.</p>

      <form onSubmit={onSubmit} noValidate className="mt-6">
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
          disabled={cargando}
          className="mt-5 w-full rounded-full bg-ink-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink-700 active:bg-ink-900/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cargando ? "Ingresando…" : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
