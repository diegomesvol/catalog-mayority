"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";
import { fetchJson } from "@/lib/apiCliente";
import { invitarClienteSchema } from "@/lib/schemas/cliente";
import { formatearFecha } from "@/lib/format";

interface Cliente {
  user_id: string;
  nombre: string;
  empresa: string;
  telefono: string;
  rif: string;
  email: string;
  activo: boolean;
  creado_en: string;
}

const VACIO = { email: "", nombre: "", empresa: "", telefono: "", rif: "" };
type Errores = Partial<Record<keyof typeof VACIO, string>>;

// Lista de clientes con cuenta de mayorista + formulario para invitar uno
// nuevo (crea la cuenta en Supabase Auth y manda el email de invitación —
// ver /api/admin/clientes). El flag `demo` de fetchJson ya cubre el aviso
// de "no se puede invitar en modo demostración" — este componente solo
// reacciona a resp.ok como siempre.
export function ClientesAdmin() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState<Errores>({});
  const [invitando, setInvitando] = useState(false);

  // mostrarCargando=false en el efecto de montaje: `cargando` ya arranca en
  // true (useState inicial), así que no hace falta volver a setearlo ahí —
  // hacerlo synchronously dentro de un efecto dispara el warning de React
  // "set-state-in-effect" (cascading renders). Al recargar tras invitar sí
  // se quiere el aviso de carga, por eso el default sigue siendo true.
  async function cargar(mostrarCargando = true) {
    if (mostrarCargando) setCargando(true);
    try {
      const { resp, data } = await fetchJson<{ ok: boolean; clientes?: Cliente[]; mensaje?: string }>("/api/admin/clientes");
      if (!resp.ok || !data?.ok || !data.clientes) throw new Error(data?.mensaje ?? "No se pudieron leer los clientes.");
      setClientes(data.clientes);
    } catch (err) {
      logError("ClientesAdmin.cargar", err);
      toast.error("No se pudieron cargar los clientes.");
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    // El "await" inicial difiere la llamada a cargar() (y su eventual
    // setState) un microtask — evita el warning set-state-in-effect sin
    // cambiar el comportamiento percibido. Ver la misma nota en
    // admin/invitacion/page.tsx.
    async function iniciar() {
      await Promise.resolve();
      await cargar(false);
    }
    iniciar();
  }, []);

  function campo<K extends keyof typeof VACIO>(clave: K, valor: string) {
    setForm({ ...form, [clave]: valor });
    if (errores[clave]) setErrores({ ...errores, [clave]: undefined });
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const resultado = invitarClienteSchema.safeParse(form);
    if (!resultado.success) {
      const nuevosErrores: Errores = {};
      for (const issue of resultado.error.issues) {
        const c = issue.path[0] as keyof Errores;
        if (!nuevosErrores[c]) nuevosErrores[c] = issue.message;
      }
      setErrores(nuevosErrores);
      return;
    }
    setErrores({});
    setInvitando(true);
    try {
      const { resp, data } = await fetchJson<{ ok: boolean; mensaje?: string }>("/api/admin/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resultado.data),
      });
      if (!resp.ok || !data?.ok) {
        toast.error(data?.mensaje ?? "No se pudo invitar al cliente.");
        return;
      }
      toast.success("Invitación enviada.");
      setForm(VACIO);
      setMostrarForm(false);
      await cargar();
    } catch (err) {
      logError("ClientesAdmin.onSubmit", err, "No se pudo conectar con el servidor — revisá tu conexión a internet y probá de nuevo.");
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setInvitando(false);
    }
  }

  return (
    <div className="rounded-2xl border border-ink-200 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-ink-900">Clientes</h2>
          <p className="mt-1 text-xs text-ink-500">Cuentas de mayoristas con acceso a su propio historial de pedidos.</p>
        </div>
        {!mostrarForm && (
          <button
            type="button"
            onClick={() => setMostrarForm(true)}
            className="shrink-0 rounded-full border border-ink-200 px-3.5 py-1.5 text-xs font-medium text-ink-900 transition-colors hover:border-ink-900"
          >
            Invitar cliente
          </button>
        )}
      </div>

      {mostrarForm && (
        <form onSubmit={onSubmit} noValidate className="mt-4 grid grid-cols-2 gap-3 border-t border-ink-200 pt-4">
          <CampoTexto id="cliente-email" etiqueta="Email" value={form.email} onChange={(v) => campo("email", v)} error={errores.email} type="email" className="col-span-2" />
          <CampoTexto id="cliente-nombre" etiqueta="Nombre" value={form.nombre} onChange={(v) => campo("nombre", v)} error={errores.nombre} />
          <CampoTexto id="cliente-empresa" etiqueta="Empresa" value={form.empresa} onChange={(v) => campo("empresa", v)} error={errores.empresa} />
          <CampoTexto id="cliente-telefono" etiqueta="Teléfono" value={form.telefono} onChange={(v) => campo("telefono", v)} error={errores.telefono} type="tel" />
          <CampoTexto id="cliente-rif" etiqueta="RIF" value={form.rif} onChange={(v) => campo("rif", v)} error={errores.rif} />

          <div className="col-span-2 mt-1 flex items-center gap-2">
            <button
              type="submit"
              disabled={invitando}
              className="rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {invitando ? "Enviando…" : "Enviar invitación"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMostrarForm(false);
                setForm(VACIO);
                setErrores({});
              }}
              disabled={invitando}
              className="rounded-full px-4 py-2 text-sm font-medium text-ink-500 transition-colors hover:text-ink-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {cargando ? (
        <div className="mt-4 space-y-2" aria-label="Cargando clientes" role="status">
          <div className="skeleton h-10 rounded-lg" />
          <div className="skeleton h-10 rounded-lg" />
        </div>
      ) : clientes.length === 0 ? (
        <p className="mt-4 text-xs text-ink-500">Todavía no hay clientes invitados.</p>
      ) : (
        <ul className="mt-4 flex flex-col divide-y divide-ink-200">
          {clientes.map((c) => (
            <li key={c.user_id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-sm">
              <div className="flex flex-col">
                <span className="text-ink-900">
                  {c.nombre} — {c.empresa}
                </span>
                <span className="text-xs text-ink-500">
                  {c.email} · {c.telefono}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-ink-500">Desde {formatearFecha(c.creado_en)}</span>
                {!c.activo && <span className="rounded-full bg-danger-100 px-2 py-0.5 font-medium text-danger-600">Inactivo</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CampoTexto({
  id,
  etiqueta,
  value,
  onChange,
  error,
  type = "text",
  className,
}: {
  id: string;
  etiqueta: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-ink-500">
        {etiqueta}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full rounded-lg border bg-paper px-3 py-2 text-sm text-ink-900 focus:border-accent-600 ${
          error ? "border-danger-600" : "border-ink-200"
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
