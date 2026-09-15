// Destino post-login a partir del ?next= que agrega el proxy al redirigir
// (ver proxy.ts). Solo se aceptan rutas internas del propio portal: nada de
// "//dominio", "/\dominio" ni URLs absolutas (open redirect).
export function destinoPostLogin(next: string | null, portal: "/admin" | "/cliente"): string {
  if (!next) return portal;
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return portal;
  if (next !== portal && !next.startsWith(`${portal}/`)) return portal;
  if (next === `${portal}/login` || next.startsWith(`${portal}/invitacion`)) return portal;
  return next;
}
