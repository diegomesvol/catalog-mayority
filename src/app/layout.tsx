import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import { CarritoProvider } from "@/components/carrito/CarritoContext";
import { CarritoDrawer } from "@/components/carrito/CarritoDrawer";
import { BusquedaProvider } from "@/components/catalogo/BusquedaContext";
import { FaviconAnimado } from "@/components/ui/FaviconAnimado";
import { ModoOffline } from "@/components/ui/ModoOffline";
import { NavegacionOverlay } from "@/components/ui/NavegacionOverlay";
import { SWRProvider } from "@/components/ui/SWRProvider";
import { leerConfigSitio } from "@/lib/blob";
import { sanearNumeroWhatsApp } from "@/lib/carrito";
import { obtenerClienteActivoCacheado } from "@/lib/sesionCliente";
import "./globals.css";

// Fuente del sistema en vez de next/font/google: carga instantánea, cero
// requests externos y excelente legibilidad en todas las plataformas — clave
// para el caso de uso principal (link abierto desde WhatsApp en el celular).

const DESCRIPCION = "Catálogo digital de venta al mayor — Volpe, Vita Kids y Kriza.";

export const metadata: Metadata = {
  metadataBase: new URL("https://catalogomesvol.vercel.app"),
  title: {
    default: "Catálogo Mayorista",
    template: "%s · Catálogo Mayorista",
  },
  description: DESCRIPCION,
  applicationName: "Catálogo Mayorista",
  appleWebApp: {
    title: "Cat. Mayorista",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "Catálogo Mayorista",
    description: DESCRIPCION,
    siteName: "Catálogo Mayorista — Calzados Mesvol, C.A.",
    locale: "es_VE",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Catálogo Mayorista",
    description: DESCRIPCION,
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Número de WhatsApp de ventas configurado desde /admin/configuracion
  // (ConfigSitio en Vercel Blob) — se resuelve acá, una sola vez por
  // request, y se pasa a CarritoProvider. Si el admin no configuró ninguno
  // todavía, CarritoProvider cae solo al de la variable de entorno (ver
  // numeroWhatsAppVentas en lib/carrito.ts).
  //
  // Mismo criterio para saber si hay un cliente logueado: se resuelve acá
  // (una vez por request) y se pasa como booleano a CarritoProvider — lo
  // único que necesita usePedidoWhatsApp para decidir si, además de abrir
  // WhatsApp, intenta guardar el pedido en /api/cliente/pedidos (ver la nota
  // grande ahí). perfilCompleto (la columna generada clientes.perfil_completo)
  // sí se expone además del booleano de logueado — lo usa el botón "Realizar
  // pedido" del carrito para bloquear con shake+toast si falta completarlo.
  // obtenerClienteActivoCacheado (no obtenerClienteActivo + un cliente
  // propio): cacheada por request, así no compite por el refresh token con
  // la misma consulta que hace Header.tsx en este mismo request — ver la
  // nota grande en lib/sesionCliente.ts.
  const [config, clienteActivo] = await Promise.all([leerConfigSitio(), obtenerClienteActivoCacheado()]);
  const numeroWhatsApp = sanearNumeroWhatsApp(config.whatsappVentas);

  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-paper text-ink-900">
        {/* Envuelve toda la app — ver la nota grande en SWRProvider.tsx. Es
            solo un Context.Provider, sin costo para quien no llama a
            useSWR(), así que no hace falta acotarlo a una parte del árbol. */}
        <SWRProvider>
          <ModoOffline />
          {/* Suspense propio (NavegacionOverlay también usa useSearchParams,
              ver esa nota) — separado del de BusquedaProvider de acá abajo
              para que un fallback de uno no dependa del otro. */}
          <Suspense fallback={null}>
            <NavegacionOverlay />
          </Suspense>
          {/* FaviconAnimado no usa useSearchParams (solo lee la señal
              compartida de lib/navegacion.ts), así que no necesita su propio
              Suspense — pero sí depende de que NavegacionOverlay esté
              montado (es quien prende/apaga la señal), ver esa nota. */}
          <FaviconAnimado />
          {/* Suspense: BusquedaProvider usa useSearchParams (para sembrar la
              búsqueda desde "?q="). El fetch de ConfigSitio de arriba ya hace
              dinámica toda la app (Vercel Blob no se puede cachear estático),
              así que este boundary ya no evita un prerender estático global —
              se mantiene igual porque sigue haciendo falta para que
              useSearchParams no rompa el build. */}
          <Suspense fallback={null}>
            <BusquedaProvider>
              <CarritoProvider
                numeroWhatsApp={numeroWhatsApp}
                clienteLogueado={Boolean(clienteActivo)}
                perfilCompleto={clienteActivo?.perfilCompleto ?? false}
                datosCliente={
                  clienteActivo
                    ? { nombre: clienteActivo.nombre, empresa: clienteActivo.empresa, telefono: clienteActivo.telefono, rif: clienteActivo.rif }
                    : null
                }
                perfilEnvioCliente={
                  clienteActivo
                    ? {
                        direccion: clienteActivo.direccion,
                        ciudad: clienteActivo.ciudad,
                        estadoUbicacion: clienteActivo.estadoUbicacion,
                        metodosPago: clienteActivo.metodosPago,
                      }
                    : null
                }
              >
                {children}
                <CarritoDrawer />
              </CarritoProvider>
            </BusquedaProvider>
          </Suspense>
          <Toaster
            position="bottom-center"
            richColors
            closeButton
            toastOptions={{
              classNames: {
                toast: "rounded-xl border border-ink-200 shadow-lg",
                title: "text-sm font-medium",
              },
            }}
          />
        </SWRProvider>
      </body>
    </html>
  );
}
