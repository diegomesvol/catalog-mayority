"use client";

import { useId } from "react";
import { toast } from "sonner";
import { useLogosFooterAdmin } from "@/hooks/useLogosFooterAdmin";
import { ImagenProducto } from "@/components/catalogo/ImagenProducto";
import type { LogoFooter } from "@/lib/types";
import { MAX_LOGOS_FOOTER } from "@/lib/schemas/logosFooter";

/** Confirmación antes de borrar — mismo patrón que ColeccionesConfig. */
function confirmarEliminar(nombre: string, alConfirmar: () => void) {
  toast(`¿Eliminar "${nombre.trim() || "este logo"}"?`, {
    description: "Esta acción no se puede deshacer.",
    duration: Infinity,
    action: { label: "Eliminar", onClick: () => alConfirmar() },
    cancel: { label: "Cancelar", onClick: () => {} },
  });
}

// Bloque "Nuestras marcas" del footer — de 1 a 4 logos que el admin carga
// libremente (a diferencia de las colecciones, acá no hay modo lectura/
// edición por tarjeta: son pocos campos por logo y siempre quedan
// editables). Cada tarjeta tiene sus 4 controles independientes que pide
// el pedido: Ver (preview con ImagenProducto), Actualizar/Reemplazar
// (mismo input de archivo, re-sube y pisa la URL), Eliminar (quita la
// tarjeta de la lista) y Ocultar/Mostrar (switch — no borra el archivo, ver
// nota abajo). Todo el estado vive en useLogosFooterAdmin.
export function LogosFooterConfig({ logosIniciales }: { logosIniciales: LogoFooter[] }) {
  const { logos, subiendoId, guardando, errores, actualizarNombre, alternarVisible, eliminar, agregar, subirImagen, guardar } =
    useLogosFooterAdmin(logosIniciales);

  return (
    <div className="rounded-2xl border border-ink-200 p-4">
      <h2 className="text-sm font-semibold text-ink-900">Nuestras marcas</h2>
      <p className="mt-1 text-xs text-ink-500">
        Los logos que se muestran en el pie de página del catálogo (mínimo 1, máximo {MAX_LOGOS_FOOTER}). Usá imágenes
        PNG o SVG con fondo transparente y proporciones parecidas entre sí (por ejemplo, todas horizontales) para que
        se vean parejas una al lado de la otra.
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {logos.map((logo) => (
          <TarjetaLogoFooter
            key={logo.id}
            logo={logo}
            error={errores[logo.id]}
            subiendo={subiendoId === logo.id}
            onNombre={(nombre) => actualizarNombre(logo.id, nombre)}
            onImagen={(archivo) => subirImagen(logo.id, archivo)}
            onAlternarVisible={() => alternarVisible(logo.id)}
            onEliminar={() => confirmarEliminar(logo.nombre, () => eliminar(logo.id))}
          />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={agregar}
          disabled={logos.length >= MAX_LOGOS_FOOTER}
          className="rounded-full border border-ink-200 px-4 py-2 text-sm font-medium text-ink-900 transition-colors hover:border-ink-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          + Agregar logo
        </button>
        <button
          type="button"
          onClick={guardar}
          disabled={guardando}
          className="rounded-full bg-ink-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {guardando ? "Guardando…" : "Guardar cambios"}
        </button>
        {logos.length >= MAX_LOGOS_FOOTER && (
          <span className="text-xs text-ink-500">Máximo de {MAX_LOGOS_FOOTER} logos alcanzado.</span>
        )}
      </div>
    </div>
  );
}

function TarjetaLogoFooter({
  logo,
  error,
  subiendo,
  onNombre,
  onImagen,
  onAlternarVisible,
  onEliminar,
}: {
  logo: LogoFooter;
  error?: string;
  subiendo: boolean;
  onNombre: (v: string) => void;
  onImagen: (archivo: File) => void;
  onAlternarVisible: () => void;
  onEliminar: () => void;
}) {
  const idNombre = useId();
  const idImagen = useId();

  return (
    <div className="rounded-xl border border-ink-200 bg-paper-raised p-3 sm:p-4">
      <div className="flex items-start gap-3">
        {/* Ver — vista previa del asset cargado, mismo patrón que el logo
            principal en ConfiguracionForm (bg-paper + p-1: da algo de aire
            alrededor de logos con fondo transparente). */}
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-ink-200 bg-paper p-1">
          <ImagenProducto src={logo.imagenUrl ?? undefined} alt={logo.nombre || "Logo"} className="h-full w-full" sizes="64px" />
        </div>

        <div className="flex-1">
          <label htmlFor={idNombre} className="mb-1 block text-xs font-medium text-ink-500">
            Nombre de la marca
          </label>
          <input
            id={idNombre}
            type="text"
            value={logo.nombre}
            onChange={(e) => onNombre(e.target.value)}
            placeholder="Ej: Volpe"
            className={`w-full rounded-lg border px-3 py-1.5 text-sm text-ink-900 focus:border-accent-600 ${
              error ? "border-danger-600" : "border-ink-200"
            }`}
          />
          {error && <p className="mt-1 text-xs text-danger-600">{error}</p>}
        </div>
      </div>

      <div className="mt-3">
        {/* Actualizar / Reemplazar — mismo input sirve para la primera
            carga y para pisar una imagen ya subida. */}
        <label htmlFor={idImagen} className="mb-1 block text-xs font-medium text-ink-500">
          {logo.imagenUrl ? "Reemplazar imagen" : "Imagen del logo"} {subiendo && "— subiendo…"}
        </label>
        <input
          id={idImagen}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          disabled={subiendo}
          onChange={(e) => {
            const archivo = e.target.files?.[0];
            if (archivo) onImagen(archivo);
            e.target.value = "";
          }}
          className="block w-full text-xs text-ink-700 file:mr-2 file:rounded-full file:border-0 file:bg-ink-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-ink-900 hover:file:bg-ink-200"
        />
        <p className="mt-1 text-[11px] text-ink-500">PNG o SVG transparente recomendado, formato horizontal, máx. 2MB.</p>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {/* Ocultar/Mostrar — no borra el archivo, solo deja de pintarse en
            el footer (mismo patrón que "Logo visible" del logo principal
            en ConfiguracionForm: <button role="switch"> único, sin <label>
            envolvente, para evitar el doble-click que reenvía el navegador
            cuando el control queda anidado dentro de un label). */}
        <button
          type="button"
          role="switch"
          aria-checked={logo.visible}
          onClick={onAlternarVisible}
          className="flex items-center gap-2.5 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-600 focus-visible:ring-offset-2"
        >
          <span
            className={`relative inline-block h-6 w-11 shrink-0 overflow-hidden rounded-full transition-colors ${
              logo.visible ? "bg-ink-900" : "bg-ink-200"
            }`}
          >
            <span
              className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                logo.visible ? "translate-x-[20px]" : "translate-x-0"
              }`}
            />
          </span>
          <span className="text-sm text-ink-900">
            {logo.visible ? "Visible" : "Oculto"}
            <span className="ml-1.5 text-xs text-ink-500">{logo.visible ? "— se muestra en el footer" : "— archivo conservado, no se renderiza"}</span>
          </span>
        </button>

        <button type="button" onClick={onEliminar} className="text-xs font-medium text-danger-600 underline-offset-2 hover:underline">
          Eliminar logo
        </button>
      </div>
    </div>
  );
}
