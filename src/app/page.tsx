import { leerCatalogoPublico, leerColecciones, leerConfigSitio, leerLogosFooter } from "@/lib/blob";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { CatalogoClient } from "@/components/catalogo/CatalogoClient";
import { EstadoVacio } from "@/components/catalogo/EstadoVacio";
import { ColeccionesHome } from "@/components/home/ColeccionesHome";
import { ClienteHeader } from "@/components/cliente/ClienteHeader";
import { obtenerClienteActivoCacheado } from "@/lib/sesionCliente";

// Siempre dinámico: el admin puede reemplazar el catálogo en cualquier momento
// y el link público debe reflejarlo de inmediato, sin caché.
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PaginaCatalogo({ searchParams }: Props) {
  const [catalogo, config, colecciones, logosFooter, sp, clienteActivo] = await Promise.all([
    leerCatalogoPublico(),
    leerConfigSitio(),
    leerColecciones(),
    leerLogosFooter(),
    searchParams,
    // Cacheada por request (ver la nota grande en lib/sesionCliente.ts) —
    // Header.tsx ya resuelve esto mismo internamente, así que pedirlo acá
    // también no duplica la consulta. Solo decide si se envuelve la página
    // con el sidebar del portal de cliente (ver más abajo) — Header.tsx no
    // cambia en absoluto, siga como siga la sesión.
    obtenerClienteActivoCacheado(),
  ]);

  // "/" sin NINGÚN query param muestra el landing de colecciones; cualquier
  // filtro en la URL (venga de una tarjeta de colección o de los Selects de
  // Filtros de siempre) muestra la grilla de siempre, sin cambios. Al
  // quitar un filtro desde ahí, CatalogoClient sincroniza la URL con
  // history.replaceState (no con el router de Next — ver la nota en ese
  // archivo), así que NUNCA dispara una navegación nueva que vuelva a
  // pasar por acá: quitar el filtro dentro de la grilla se queda en la
  // grilla mostrando todo, tal como pedía Diego, aunque la URL vuelva a
  // quedar en "/". Si todavía no hay colecciones cargadas en el admin, se
  // deja la grilla de siempre — no tiene sentido mostrar un landing vacío.
  const mostrarLanding = Object.keys(sp).length === 0 && colecciones.length > 0;

  const contenido = (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
        {!catalogo || catalogo.productos.length === 0 ? (
          <EstadoVacio
            titulo="Todavía no hay catálogo publicado"
            descripcion="El administrador aún no cargó productos. Volvé a intentarlo más tarde."
          />
        ) : mostrarLanding ? (
          <ColeccionesHome colecciones={colecciones} productos={catalogo.productos} />
        ) : (
          <CatalogoClient productos={catalogo.productos} />
        )}
      </main>
      <Footer config={config} logosFooter={logosFooter} />
    </>
  );

  // Sin sesión de cliente: exactamente el layout de siempre, sin sidebar.
  // Con sesión activa: mismo sidebar que "Mi cuenta" (ver ClienteHeader)
  // envolviendo el catálogo, para que no haya salto de navegación entre las
  // dos áreas — Header.tsx sigue siendo la barra de arriba tal cual estaba
  // (logo/búsqueda/carrito), sin tocarla — ClienteHeader ya NO tiene una
  // barra propia (ver esa nota grande ahí), es solo el sidebar.
  if (!clienteActivo) return contenido;
  return (
    <ClienteHeader
      perfilCompleto={clienteActivo.perfilCompleto}
      cliente={{ nombre: clienteActivo.nombre, email: clienteActivo.email, avatarUrl: clienteActivo.avatarUrl }}
    >
      {contenido}
    </ClienteHeader>
  );
}
