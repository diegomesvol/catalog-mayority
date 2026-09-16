import { iniciales } from "@/lib/format";

interface Props {
  nombre: string;
  avatarUrl: string | null;
  // Logo de la tienda — fallback de avatar cuando el cliente entró con
  // contraseña (avatarUrl null, no hay foto de Google), mismo criterio que
  // ya tenía CuentaClienteMenu antes de esta extracción.
  logoTiendaUrl?: string | null;
  size?: "sm" | "md";
}

// Avatar de cliente + punto "en línea" — extraído de CuentaClienteMenu.tsx
// para reusarlo tal cual en ClienteNav.tsx (bloque de identidad del
// sidebar): mismo fallback (foto de Google > logo de la tienda > iniciales)
// y mismo indicador de sesión activa en los dos lugares donde se muestra.
export function AvatarCliente({ nombre, avatarUrl, logoTiendaUrl = null, size = "sm" }: Props) {
  const clases = size === "md" ? "h-9 w-9" : "h-7 w-7";
  return (
    <span className="relative inline-flex shrink-0">
      {avatarUrl || logoTiendaUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- foto de Google o logo de la tienda en Supabase Storage, dominio externo
        <img
          src={avatarUrl ?? logoTiendaUrl!}
          alt=""
          className={`${clases} rounded-full object-cover ${avatarUrl ? "" : "border border-ink-200 bg-white object-contain p-0.5"}`}
        />
      ) : (
        <span className={`flex ${clases} items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-white`}>
          {iniciales(nombre)}
        </span>
      )}
      {/* Punto "en línea" — confirma sesión activa de un vistazo. */}
      <span
        className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-paper bg-success-600"
        aria-hidden="true"
      />
    </span>
  );
}
