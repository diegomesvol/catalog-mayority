// PDF "Nota de Entrega" de un pedido — lo genera api/cliente/pedidos/[id]/pdf
// con @react-pdf/renderer (renderToBuffer, corre en Node, no en el navegador
// ni en Edge — ver runtime="nodejs" en esa ruta). Documento simple: un solo
// componente, sin reutilización fuera de esa ruta.

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import { formatearPrecio } from "@/lib/format";
import { subtotalDelItem, unidadesDelItem, type DatosComprador, type ItemCarrito } from "@/lib/carrito";

export interface DatosNotaEntrega {
  id: string;
  creadoEn: string;
  estado: "pendiente" | "confirmado" | "despachado" | "cancelado";
  items: ItemCarrito[];
  comprador: DatosComprador;
  total: number;
  notasAdmin: string | null;
  // Datos de envío tomados del perfil del cliente al momento de generar el
  // PDF (no del snapshot `comprador`, que solo trae nombre/empresa/
  // teléfono/RIF — ver lib/schemas/pedido.ts) — puede venir null si el
  // cliente todavía no los había completado cuando hizo este pedido.
  telefono2: string | null;
  direccion: string | null;
  ciudad: string | null;
  estadoUbicacion: string | null;
}

const ESTADO_ETIQUETA: Record<DatosNotaEntrega["estado"], string> = {
  pendiente: "Pendiente",
  confirmado: "Confirmado",
  despachado: "Despachado",
  cancelado: "Cancelado",
};

const estilos = StyleSheet.create({
  page: { padding: 32, fontSize: 9, fontFamily: "Helvetica", color: "#1c1a17" },
  encabezado: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  tituloEmpresa: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  tituloDocumento: { fontSize: 12, fontFamily: "Helvetica-Bold", textAlign: "right" },
  meta: { fontSize: 9, color: "#4a453e", textAlign: "right", marginTop: 2 },
  seccion: { marginBottom: 14 },
  seccionTitulo: { fontSize: 9, fontFamily: "Helvetica-Bold", marginBottom: 4, textTransform: "uppercase", color: "#4a453e" },
  filaDatos: { flexDirection: "row", flexWrap: "wrap", gap: 16 },
  dato: { marginRight: 16, marginBottom: 2 },
  datoEtiqueta: { color: "#78716c" },
  tabla: { borderTop: "1px solid #e7e4de", borderBottom: "1px solid #e7e4de" },
  filaTabla: { flexDirection: "row", borderBottom: "1px solid #e7e4de", paddingVertical: 5 },
  filaTablaEncabezado: { flexDirection: "row", paddingVertical: 5, backgroundColor: "#f1efe9", fontFamily: "Helvetica-Bold" },
  colProducto: { flex: 3 },
  colCantidad: { flex: 1.4, textAlign: "right" },
  colPrecio: { flex: 1.4, textAlign: "right" },
  colSubtotal: { flex: 1.4, textAlign: "right" },
  totalFila: { flexDirection: "row", justifyContent: "flex-end", marginTop: 8, paddingTop: 8, borderTop: "1px solid #1c1a17" },
  totalEtiqueta: { fontFamily: "Helvetica-Bold", marginRight: 12 },
  totalValor: { fontFamily: "Helvetica-Bold" },
  piePagina: { position: "absolute", bottom: 24, left: 32, right: 32, fontSize: 7.5, color: "#78716c", textAlign: "center" },
});

export function NotaEntregaDocumento({ pedido }: { pedido: DatosNotaEntrega }) {
  const fecha = new Date(pedido.creadoEn).toLocaleDateString("es-VE", { day: "2-digit", month: "long", year: "numeric" });
  const numero = pedido.id.slice(0, 8).toUpperCase();

  return (
    <Document title={`Nota de entrega ${numero}`}>
      <Page size="A4" style={estilos.page}>
        <View style={estilos.encabezado}>
          <View>
            <Text style={estilos.tituloEmpresa}>Calzados Mesvol, C.A.</Text>
            <Text style={estilos.meta}>Catálogo mayorista — Volpe · Vita Kids · Kriza</Text>
          </View>
          <View>
            <Text style={estilos.tituloDocumento}>NOTA DE ENTREGA</Text>
            <Text style={estilos.meta}>N.° {numero}</Text>
            <Text style={estilos.meta}>{fecha}</Text>
            <Text style={estilos.meta}>Estado: {ESTADO_ETIQUETA[pedido.estado]}</Text>
          </View>
        </View>

        <View style={estilos.seccion}>
          <Text style={estilos.seccionTitulo}>Cliente</Text>
          <View style={estilos.filaDatos}>
            <Text style={estilos.dato}>
              <Text style={estilos.datoEtiqueta}>Razón social: </Text>
              {pedido.comprador.empresa || pedido.comprador.nombre}
            </Text>
            <Text style={estilos.dato}>
              <Text style={estilos.datoEtiqueta}>Contacto: </Text>
              {pedido.comprador.nombre}
            </Text>
            <Text style={estilos.dato}>
              <Text style={estilos.datoEtiqueta}>RIF: </Text>
              {pedido.comprador.rif}
            </Text>
            <Text style={estilos.dato}>
              <Text style={estilos.datoEtiqueta}>Tel: </Text>
              {pedido.comprador.telefono}
              {pedido.telefono2 ? ` / ${pedido.telefono2}` : ""}
            </Text>
            {(pedido.direccion || pedido.ciudad) && (
              <Text style={estilos.dato}>
                <Text style={estilos.datoEtiqueta}>Envío: </Text>
                {[pedido.direccion, pedido.ciudad, pedido.estadoUbicacion].filter(Boolean).join(", ")}
              </Text>
            )}
          </View>
        </View>

        <View style={estilos.seccion}>
          <Text style={estilos.seccionTitulo}>Productos</Text>
          <View style={estilos.tabla}>
            <View style={estilos.filaTablaEncabezado}>
              <Text style={estilos.colProducto}>Producto</Text>
              <Text style={estilos.colCantidad}>Cantidad</Text>
              <Text style={estilos.colPrecio}>P. unitario</Text>
              <Text style={estilos.colSubtotal}>Subtotal</Text>
            </View>
            {pedido.items.map((item) => (
              <View key={item.itemId} style={estilos.filaTabla}>
                <Text style={estilos.colProducto}>
                  {item.marca} — {item.modelo} — {item.color}
                  {item.esCalzado && item.curvaRango !== "Único" ? ` (Tallas ${item.curvaRango})` : ""}
                  {"\n"}
                  <Text style={{ color: "#78716c" }}>Cod. SAP: {item.codigoSap}</Text>
                </Text>
                <Text style={estilos.colCantidad}>
                  {item.esCalzado
                    ? `${item.cantidad} bulto${item.cantidad === 1 ? "" : "s"} (${unidadesDelItem(item)} pares)`
                    : `${item.cantidad} unidad${item.cantidad === 1 ? "" : "es"}`}
                </Text>
                <Text style={estilos.colPrecio}>{formatearPrecio(item.precio)}</Text>
                <Text style={estilos.colSubtotal}>{formatearPrecio(subtotalDelItem(item))}</Text>
              </View>
            ))}
          </View>
          <View style={estilos.totalFila}>
            <Text style={estilos.totalEtiqueta}>TOTAL</Text>
            <Text style={estilos.totalValor}>{formatearPrecio(pedido.total)}</Text>
          </View>
        </View>

        {pedido.notasAdmin && (
          <View style={estilos.seccion}>
            <Text style={estilos.seccionTitulo}>Nota</Text>
            <Text>{pedido.notasAdmin}</Text>
          </View>
        )}

        <Text style={estilos.piePagina}>
          Las cantidades son referenciales — el vendedor confirma disponibilidad final antes del despacho. Documento generado automáticamente,
          no es factura fiscal.
        </Text>
      </Page>
    </Document>
  );
}
