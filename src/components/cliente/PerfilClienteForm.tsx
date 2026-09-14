"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { fetchJson } from "@/lib/apiCliente";
import { logError } from "@/lib/logger";
import type { PerfilCliente } from "@/lib/clienteAuth";
import { METODOS_PAGO_ETIQUETA, METODOS_PAGO_OPCIONES, actualizarPerfilClienteSchema, type MetodoPago } from "@/lib/schemas/perfilCliente";

// Estados de Venezuela — solo como sugerencias de un <datalist> (no fuerza
// a elegir de la lista, por si algún cliente vende desde otro país o
// escribe distinto): logística real, no un enum rígido en la base.
const ESTADOS_VENEZUELA = [
  "Amazonas", "Anzoátegui", "Apure", "Aragua", "Barinas", "Bolívar", "Carabobo", "Cojedes",
  "Delta Amacuro", "Distrito Capital", "Falcón", "Guárico", "Lara", "Mérida", "Miranda",
  "Monagas", "Nueva Esparta", "Portuguesa", "Sucre", "Táchira", "Trujillo", "La Guaira", "Yaracuy", "Zulia",
];

type Errores = Partial<Record<"telefono2" | "direccion" | "ciudad" | "estadoUbicacion" | "metodosPago", string>>;

export function PerfilClienteForm({ perfilInicial }: { perfilInicial: PerfilCliente }) {
  const router = useRouter();
  const [telefono2, setTelefono2] = useState(perfilInicial.telefono2 ?? "");
  const [direccion, setDireccion] = useState(perfilInicial.direccion ?? "");
  const [ciudad, setCiudad] = useState(perfilInicial.ciudad ?? "");
  const [estadoUbicacion, setEstadoUbicacion] = useState(perfilInicial.estadoUbicacion ?? "");
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>((perfilInicial.metodosPago as MetodoPago[]) ?? []);
  const [logoUrl, setLogoUrl] = useState(perfilInicial.logoUrl);
  const [subiendoLogo, setSubiendoLogo] = useState(false);
  const [errores, setErrores] = useState<Errores>({});
  const [guardando, setGuardando] = useState(false);

  function alternarMetodo(metodo: MetodoPago) {
    setMetodosPago((prev) => (prev.includes(metodo) ? prev.filter((m) => m !== metodo) : [...prev, metodo]));
    if (errores.metodosPago) setErrores({ ...errores, metodosPago: undefined });
  }

  async function subirLogo(archivo: File) {
    setSubiendoLogo(true);
    try {
      const formData = new FormData();
      formData.append("archivo", archivo);
      const { resp, data } = await fetchJson<{ ok: boolean; url?: string; mensaje?: string }>("/api/cliente/perfil/logo", {
        method: "POST",
        body: formData,
      });
      if (!resp.ok || !data?.ok || !data.url) {
        toast.error(data?.mensaje ?? "No se pudo subir el logo.");
        return;
      }
      setLogoUrl(data.url);
      toast.success("Logo actualizado.");
    } catch (err) {
      logError("PerfilClienteForm.subirLogo", err, "No se pudo conectar con el servidor.");
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setSubiendoLogo(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();

    const resultado = actualizarPerfilClienteSchema.safeParse({ telefono2, direccion, ciudad, estadoUbicacion, metodosPago });
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
    setGuardando(true);
    try {
      const { resp, data } = await fetchJson<{ ok: boolean; mensaje?: string }>("/api/cliente/perfil", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resultado.data),
      });
      if (!resp.ok || !data?.ok) {
        toast.error(data?.mensaje ?? "No se pudo guardar el perfil.");
        setGuardando(false);
        return;
      }

      const eraOnboarding = !perfilInicial.perfilCompleto;
      toast.success(eraOnboarding ? "Perfil completo — ya podés hacer pedidos." : "Perfil actualizado.");
      router.refresh();
      if (eraOnboarding) router.push("/");
      setGuardando(false);
    } catch (err) {
      logError("PerfilClienteForm.onSubmit", err, "No se pudo conectar con el servidor.");
      toast.error("No se pudo conectar con el servidor.");
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-6">
      <section className="rounded-2xl border border-ink-200 bg-paper-raised p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink-900">Datos de la cuenta</h2>
        <p className="mt-1 text-xs text-ink-500">Estos datos los configuró el administrador — si necesitás corregirlos, escribile.</p>
        <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <Campo etiqueta="Nombre / razón social" valor={perfilInicial.empresa || perfilInicial.nombre} />
          <Campo etiqueta="Contacto" valor={perfilInicial.nombre} />
          <Campo etiqueta="Teléfono principal" valor={perfilInicial.telefono} />
          <Campo etiqueta="RIF / cédula" valor={perfilInicial.rif} />
        </dl>
      </section>

      <section className="rounded-2xl border border-ink-200 bg-paper-raised p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink-900">Logo del negocio</h2>
        <div className="mt-3 flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-ink-200 bg-paper">
            {logoUrl && <Image src={logoUrl} alt="" fill sizes="64px" className="object-cover" unoptimized />}
          </div>
          <label className="cursor-pointer rounded-full border border-ink-200 px-4 py-2 text-sm font-medium text-ink-700 transition-colors hover:bg-ink-100">
            {subiendoLogo ? "Subiendo…" : logoUrl ? "Cambiar logo" : "Subir logo"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={subiendoLogo}
              onChange={(e) => {
                const archivo = e.target.files?.[0];
                if (archivo) void subirLogo(archivo);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-ink-200 bg-paper-raised p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink-900">Envío y contacto</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <CampoInput
            id="telefono2"
            etiqueta="Segundo teléfono"
            type="tel"
            value={telefono2}
            onChange={setTelefono2}
            error={errores.telefono2}
            className="col-span-2 sm:col-span-1"
          />
          <CampoInput
            id="ciudad"
            etiqueta="Ciudad"
            value={ciudad}
            onChange={setCiudad}
            error={errores.ciudad}
            className="col-span-2 sm:col-span-1"
          />
          <CampoInput
            id="estadoUbicacion"
            etiqueta="Estado"
            value={estadoUbicacion}
            onChange={setEstadoUbicacion}
            error={errores.estadoUbicacion}
            className="col-span-2 sm:col-span-1"
            listaSugerencias="estados-venezuela"
          />
          <datalist id="estados-venezuela">
            {ESTADOS_VENEZUELA.map((estado) => (
              <option key={estado} value={estado} />
            ))}
          </datalist>
          <CampoInput
            id="direccion"
            etiqueta="Dirección de envío"
            value={direccion}
            onChange={setDireccion}
            error={errores.direccion}
            className="col-span-2"
          />
        </div>
      </section>

      <section className="rounded-2xl border border-ink-200 bg-paper-raised p-4 sm:p-5">
        <h2 className="text-sm font-semibold text-ink-900">Métodos de pago que aceptás</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {METODOS_PAGO_OPCIONES.map((metodo) => {
            const activo = metodosPago.includes(metodo);
            return (
              <button
                key={metodo}
                type="button"
                onClick={() => alternarMetodo(metodo)}
                aria-pressed={activo}
                className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  activo ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-700 hover:bg-ink-100"
                }`}
              >
                {METODOS_PAGO_ETIQUETA[metodo]}
              </button>
            );
          })}
        </div>
        {errores.metodosPago && <p className="mt-2 text-xs text-danger-600">{errores.metodosPago}</p>}
      </section>

      <button
        type="submit"
        disabled={guardando}
        className="w-full rounded-full bg-ink-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:self-start"
      >
        {guardando ? "Guardando…" : "Guardar perfil"}
      </button>
    </form>
  );
}

function Campo({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-500">{etiqueta}</dt>
      <dd className="truncate text-ink-900">{valor}</dd>
    </div>
  );
}

function CampoInput({
  id,
  etiqueta,
  value,
  onChange,
  error,
  type = "text",
  className,
  listaSugerencias,
}: {
  id: string;
  etiqueta: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  type?: string;
  className?: string;
  listaSugerencias?: string;
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
        list={listaSugerencias}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`w-full rounded-lg border bg-paper px-3 py-2 text-sm focus:border-accent-600 ${error ? "border-danger-600" : "border-ink-200"}`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-danger-600">
          {error}
        </p>
      )}
    </div>
  );
}
