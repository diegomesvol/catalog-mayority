import { AdminHeader } from "@/components/admin/AdminHeader";
import { ClientesAdmin } from "@/components/admin/ClientesAdmin";

export const metadata = { title: "Clientes" };

export default function PaginaAdminClientes() {
  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <ClientesAdmin />
      </main>
    </>
  );
}
