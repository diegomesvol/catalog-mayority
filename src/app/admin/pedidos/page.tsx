import { AdminHeader } from "@/components/admin/AdminHeader";
import { PedidosAdmin } from "@/components/admin/PedidosAdmin";

export const metadata = { title: "Pedidos" };

export default function PaginaAdminPedidos() {
  return (
    <>
      <AdminHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        <PedidosAdmin />
      </main>
    </>
  );
}
