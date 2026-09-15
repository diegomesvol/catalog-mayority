"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { toast } from "sonner";
import { logError } from "@/lib/logger";

interface ClienteSesion {
  nombre: string;
  email: string;
  avatarUrl: string | null;
}

interface Props {
  cliente: ClienteSesion | null;
  // Logo de la tienda (config.logoUrl, ver ConfiguracionForm) — fallback de
  // avatar cuando el cliente entró con contraseña (avatarUrl null, no hay
  // foto de Google) en vez de saltar directo a iniciales. Independiente del
  // toggle "Logo visible" del header (ese controla el logo junto al título,
  // no este avatar) — por eso Header.tsx pasa config.logoUrl sin filtrar
  // por logoVisible.
  logoTiendaUrl?: string | null;
}

function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  const primera = partes[0][0];
  const segunda = partes.length > 1 ? partes[partes.length - 1][0] : "";
  return (primera + segunda).toUpperCase();
}

// Reemplaza el link simple "Ingresar"/"Mi cuenta" del header público (ver
// Header.tsx): sin sesión, mismo link de siempre; con sesión activa, ahora
// se ve QUIÉN está logueado (avatar de Google o iniciales + punto "en
// línea" + nombre) y, al tocarlo, un menú con acceso al portal y Cerrar
// sesión — antes el ícono de persona era idéntico logueado o no, así que no
// había forma de confirmar la sesión sin entrar a /cliente.
//
// Cerrar sesión desde acá NO redirige a /cliente/login (a diferencia de
// ClienteHeader, que vive DENTRO del portal): el cliente puede estar en
// medio del catálogo público, así que solo se refresca la página actual
// para que el header vuelva a "Ingresar" sin sacarlo de donde estaba.
export function CuentaClienteMenu({ cliente, logoTiendaUrl = null }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [saliendo, setSaliendo] = useState(false);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const idMenu = useId();

  useEffect(() => {
    if (!abierto) return;
    function onPointerDown(e: MouseEvent) {
      if (!contenedorRef.current?.contains(e.target as Node)) setAbierto(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setAbierto(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [abierto]);

  async function salir() {
    setSaliendo(true);
    try {
      await fetch("/api/cliente/logout", { method: "POST" });
      setAbierto(false);
      router.refresh();
    } catch (err) {
      logError(
        "CuentaClienteMenu.salir",
        err,
        "No se pudo llegar al servidor para cerrar sesión — revisá tu conexión a internet y probá de nuevo.",
      );
      toast.error("No se pudo cerrar sesión. Probá de nuevo.");
    } finally {
      setSaliendo(false);
    }
  }

  if (!cliente) {
    return (
      <Link
        href="/cliente/login"
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-ink-200 px-2.5 py-2 text-sm font-medium text-ink-900 transition-colors hover:border-ink-900 sm:px-3.5"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <span className="hidden sm:inline">Ingresar</span>
      </Link>
    );
  }

  return (
    <div ref={contenedorRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-controls={idMenu}
        className="flex items-center gap-2 rounded-full border border-ink-200 py-1 pl-1 pr-2.5 transition-colors hover:border-ink-900 sm:pr-3.5"
      >
        <span className="relative shrink-0">
          {cliente.avatarUrl || logoTiendaUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- foto de Google o logo de la tienda en Supabase Storage, dominio externo
            <img
              src={cliente.avatarUrl ?? logoTiendaUrl!}
              alt=""
              className={`h-7 w-7 rounded-full object-cover ${cliente.avatarUrl ? "" : "border border-ink-200 bg-white object-contain p-0.5"}`}
            />
          ) : (
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-white">
              {iniciales(cliente.nombre)}
            </span>
          )}
          {/* Punto "en línea" — confirma sesión activa de un vistazo, sin
              tener que leer el nombre ni abrir el menú. */}
          <span
            className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-paper bg-success-600"
            aria-hidden="true"
          />
        </span>
        <span className="hidden max-w-[10ch] truncate text-sm font-medium text-ink-900 sm:inline">
          {cliente.nombre.split(" ")[0]}
        </span>
      </button>

      {abierto && (
        <div
          id={idMenu}
          role="menu"
          className="absolute right-0 z-30 mt-2 w-56 overflow-hidden rounded-xl border border-ink-200 bg-paper-raised py-1.5 shadow-xl"
        >
          <div className="border-b border-ink-200 px-3.5 py-2.5">
            <p className="truncate text-sm font-medium text-ink-900">{cliente.nombre}</p>
            <p className="truncate text-xs text-ink-500">{cliente.email}</p>
          </div>
          <Link
            href="/cliente"
            role="menuitem"
            onClick={() => setAbierto(false)}
            className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-ink-900 transition-colors hover:bg-ink-100"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true" className="shrink-0">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Mi cuenta
          </Link>
          {/* Cerrar sesión: única acción destructiva/de salida del menú, por
              eso siempre en rojo (texto + ícono) — nunca el mismo tono que
              "Mi cuenta". En mobile (debajo de "sm") el texto se oculta y
              queda solo el ícono de salida, a pedido. */}
          <button
            type="button"
            role="menuitem"
            onClick={salir}
            disabled={saliendo}
            className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm font-medium text-danger-600 transition-colors hover:bg-danger-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true" className="shrink-0">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="hidden sm:inline">{saliendo ? "Saliendo…" : "Cerrar sesión"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
