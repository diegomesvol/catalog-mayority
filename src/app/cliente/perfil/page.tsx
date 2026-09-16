import { PerfilClienteForm } from "@/components/cliente/PerfilClienteForm";
import { crearClienteServidor } from "@/lib/supabase";
import { obtenerClienteActivo } from "@/lib/clienteAuth";

export const metadata = { title: "Mi perfil" };
export const dynamic = "force-dynamic";

// El proxy ya garantiza que solo llega acá un cliente activo logueado — se
// vuelve a resolver el perfil (no se asume) por la misma razón que
// cliente/page.tsx: es la forma normal de leer datos propios en un server
// component. Esta es la pantalla de onboarding (primera vez, perfil
// incompleto) Y la de "editar mi perfil" más adelante — mismo formulario.
export default async function PaginaPerfilCliente() {
  const supabase = await crearClienteServidor();
  const perfil = await obtenerClienteActivo(supabase);

  return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <h1 className="text-base font-semibold text-ink-900">Mi perfil</h1>
        <p className="mt-1 text-sm text-ink-500">
          {perfil?.perfilCompleto
            ? "Tus datos de envío y facturación."
            : "Completá estos datos para poder realizar pedidos desde el catálogo."}
        </p>

        {perfil && <PerfilClienteForm perfilInicial={perfil} />}
      </main>
  );
}
