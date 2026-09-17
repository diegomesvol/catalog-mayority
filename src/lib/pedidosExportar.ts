// Exportar la tabla de Gestión de Pedidos a .xlsx — mismo criterio que
// lib/inventarioExportar.ts (reutiliza la dependencia "xlsx" que el
// proyecto ya tiene): mismas columnas que se ven en pantalla, para que lo
// exportado sea justo lo que se está mirando (o lo seleccionado, en
// "Exportar selección").

import * as XLSX from "xlsx";
import { formatearPrecio } from "./format";
import type { DatosComprador, ItemCarrito } from "./carrito";
import { ESTADO_PEDIDO_ETIQUETA, METODOS_ENVIO_ETIQUETA, METODOS_PAGO_ETIQUETA, type EstadoPedido, type MetodoEnvio, type MetodoPago } from "./schemas/pedido";

export interface PedidoExportable {
  id: string;
  creado_en: string;
  estado: EstadoPedido;
  items: ItemCarrito[];
  comprador: DatosComprador;
  total: number;
  metodo_pago: MetodoPago | null;
  metodo_envio: MetodoEnvio | null;
}

export function exportarPedidosExcel(pedidos: PedidoExportable[], nombreArchivo: string): void {
  const filas = pedidos.map((p) => ({
    "N.° de orden": p.id.slice(0, 8).toUpperCase(),
    "Fecha y hora": new Date(p.creado_en).toLocaleString("es-VE"),
    Cliente: p.comprador.nombre,
    Empresa: p.comprador.empresa,
    RIF: p.comprador.rif,
    Teléfono: p.comprador.telefono,
    "Método de pago": p.metodo_pago ? METODOS_PAGO_ETIQUETA[p.metodo_pago] : "",
    "Método de envío": p.metodo_envio ? METODOS_ENVIO_ETIQUETA[p.metodo_envio] : "",
    Productos: p.items.length,
    Total: Math.round(p.total * 100) / 100,
    Estado: ESTADO_PEDIDO_ETIQUETA[p.estado],
  }));

  const hoja = XLSX.utils.json_to_sheet(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Pedidos");
  XLSX.writeFile(libro, nombreArchivo);
}
