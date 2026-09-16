import { AdminHeader } from "@/components/admin/AdminHeader";
import { InventarioAdmin } from "@/components/admin/InventarioAdmin";
import { leerCatalogoParaInventario, leerUmbralesStock } from "@/lib/blob";

export const metadata = { title: "Inventario · Panel de administración" };
// Igual que el resto de las páginas que leen el catálogo publicado
// (dashboard, catálogo público): puede cambiar en cualquier momento y este
// panel debe reflejarlo al instante, sin caché de Next de por medio.
export const dynamic = "force-dynamic";

export default async function PaginaAdminInventario() {
  const [productos, umbrales] = await Promise.all([leerCatalogoParaInventario(), leerUmbralesStock()]);

  return (
    <AdminHeader>
      {/* max-w-6xl (no max-w-3xl como el resto del panel): esta es una tabla
          de datos densa, con más columnas de las que ese ancho angosto
          alcanza a mostrar sin scroll horizontal constante. */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <InventarioAdmin productosIniciales={productos} umbralesIniciales={umbrales} />
      </main>
    </AdminHeader>
  );
}
