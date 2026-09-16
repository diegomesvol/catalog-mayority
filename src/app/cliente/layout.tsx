import type { ReactNode } from "react";
import { ClienteHeader } from "@/components/cliente/ClienteHeader";
import { Header } from "@/components/ui/Header";
import { obtenerClienteActivoCacheado } from "@/lib/sesionCliente";

// Layout compartido por TODO lo que cuelga de /cliente/* — a diferencia de
// que cada page.tsx montara su propio <ClienteHeader> (como era antes),
// Next NO remonta un layout al navegar entre sus rutas hijas: sidebar,
// header y el fetch de logoUrl (ver ClienteHeader) se montan una sola vez y
// quedan fijos mientras el cliente pasa de "Mis pedidos" a "Mi perfil" —
// sin el parpadeo/reinicio que había antes en cada click.
//
// /cliente/login y /cliente/invitacion viven bajo esta misma carpeta pero
// NO deben tener sidebar. Acá se resuelve `perfil` (cacheado por request,
// ver lib/sesionCliente.ts — Header.tsx pide lo mismo más abajo sin
// duplicar la consulta) y si es null se devuelven los children tal cual,
// sin el shell:
//  - /cliente/login: el proxy (src/proxy.ts) ya redirige a un cliente YA
//    logueado que entra ahí de vuelta a /cliente, así que ese caso ni
//    siquiera llega acá con perfil no-null.
//  - /cliente/invitacion: el token de invitación se procesa del lado del
//    navegador (ver la nota grande en proxy.ts) — en el render del
//    servidor todavía no hay sesión, así que tampoco hay shell.
//  - /cliente, /cliente/perfil, /cliente/pedidos/[id]: el proxy garantiza
//    sesión activa, perfil siempre no-null acá.
export default async function LayoutCliente({ children }: { children: ReactNode }) {
  const perfil = await obtenerClienteActivoCacheado();
  if (!perfil) return children;

  return (
    <ClienteHeader
      perfilCompleto={perfil.perfilCompleto}
      cliente={{ nombre: perfil.nombre, email: perfil.email, avatarUrl: perfil.avatarUrl }}
    >
      <Header />
      {children}
    </ClienteHeader>
  );
}
