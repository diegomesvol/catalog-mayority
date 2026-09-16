"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { fetchJson } from "@/lib/apiCliente";
import type { ConfigSitio } from "@/lib/types";
import { ClienteNav } from "./ClienteNav";

interface ClienteSesion {
  nombre: string;
  email: string;
  avatarUrl: string | null;
}

interface Props {
  children: ReactNode;
  perfilCompleto: boolean;
  // Identidad de la sesión — el caller ya resuelve
  // obtenerClienteActivo/obtenerClienteActivoCacheado de todas formas, así
  // que se la pasa directo, sin fetch aparte acá. Alimenta el bloque de
  // avatar/nombre del pie del sidebar (ver ClienteNav). null es defensivo
  // (mismo criterio que perfilCompleto ?? true en cada page.tsx) — no
  // debería darse con un cliente realmente logueado.
  cliente?: ClienteSesion | null;
}

// Shell del portal de cliente — SOLO el sidebar (ver ClienteNav) + el <main>
// como children; la barra superior (búsqueda/carrito/logo/drawer mobile) es
// SIEMPRE Header.tsx, el mismo componente en toda la app con sesión activa
// — ya no hay una barra propia acá adentro. Quien renderiza este shell
// (app/cliente/layout.tsx para "Mi cuenta"; app/page.tsx y
// app/producto/[id]/page.tsx para el catálogo, cuando hay sesión) es
// responsable de incluir <Header /> dentro de los children — eso es lo que
// garantiza el mismo Drawer mobile (MenuMovilCatalogo) en TODAS las
// pantallas logueadas, catálogo o Mi Cuenta, en vez de un menú aparte acá
// (el "ClienteNavMovil" que existía antes: por eso "/cliente" mostraba un
// menú horizontal distinto al Drawer del catálogo — daba la sensación de
// una interfaz rota / con dos navegaciones superpuestas).
//
// "ClienteHeader" queda como nombre aunque ya es bastante más que un header
// (ver la nota equivalente en AdminHeader.tsx): es el único punto de import
// y no hay forma de renombrar el archivo sin borrar el original (no se
// puede en el dispositivo conectado).
export function ClienteHeader({ children, perfilCompleto, cliente = null }: Props) {
  // Logo de marca — mismo dato que usa Header.tsx del catálogo público
  // (config.logoVisible/config.logoUrl), pedido acá client-side porque
  // ClienteHeader es un Client Component sin acceso directo a
  // leerConfigSitio(); mismo patrón que AdminHeader.tsx usa para su título
  // dinámico. /api/admin/config GET no requiere sesión (ver esa nota en
  // AdminHeader.tsx). Sirve de ancla visual para que la marca no desaparezca
  // al cruzar del catálogo (sin sesión, sin este shell) a acá (con sesión).
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  useEffect(() => {
    fetchJson<{ ok: boolean; config?: ConfigSitio }>("/api/admin/config").then(({ data }) => {
      if (data?.ok && data.config?.logoVisible && data.config.logoUrl) setLogoUrl(data.config.logoUrl);
    });
  }, []);

  return (
    <div className="flex flex-1">
      <ClienteNav logoUrl={logoUrl} cliente={cliente} />

      <div className="flex min-w-0 flex-1 flex-col overflow-x-hidden">
        {!perfilCompleto && (
          <div className="border-b border-warning-600/30 bg-warning-100 px-4 py-2.5 sm:px-6">
            <p className="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-2 gap-y-1 text-xs text-warning-600">
              <span className="font-medium">Tu perfil está incompleto.</span>
              <span>Completalo para poder realizar pedidos.</span>
              <Link href="/cliente/perfil" className="font-medium underline underline-offset-2 hover:no-underline">
                Completar perfil
              </Link>
            </p>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}
