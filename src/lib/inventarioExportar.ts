// Exportar la tabla del Panel de Inventario a .xlsx — corre en el navegador
// (botón "Exportar" en InventarioAdmin.tsx), reutilizando la dependencia
// "xlsx" que el proyecto ya tiene para el importador de catálogo
// (CargadorCatalogo). Mismas columnas que se ven en pantalla, para que lo
// que se exporta sea exactamente lo que se está mirando.

import * as XLSX from "xlsx";
import type { Producto } from "./types";
import { stockTotalProducto, tallasDelProducto } from "./producto";
import { estadoStockProducto, valorInventarioProducto, type EstadoStock } from "./inventario";

const ETIQUETA_ESTADO: Record<EstadoStock, string> = {
  disponible: "Disponible",
  bajo: "Bajo stock",
  agotado: "Agotado",
};

export function exportarInventarioExcel(productos: Producto[], umbrales: Record<string, number>, nombreArchivo: string): void {
  const filas = productos.map((p) => {
    const precios = p.colores.map((c) => c.precio);
    return {
      "Código/Modelo": p.codigoModelo ?? p.id,
      Producto: p.modelo,
      Marca: p.marca,
      Línea: p.linea ?? "",
      Género: p.genero,
      Colores: p.colores.map((c) => c.color).join(", "),
      Tallas: tallasDelProducto(p).join(", "),
      "Stock total": stockTotalProducto(p),
      Precio: precios.length > 0 ? Math.min(...precios) : 0,
      Estado: ETIQUETA_ESTADO[estadoStockProducto(p, umbrales)],
      "Valor inventario": Math.round(valorInventarioProducto(p) * 100) / 100,
    };
  });

  const hoja = XLSX.utils.json_to_sheet(filas);
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, "Inventario");
  XLSX.writeFile(libro, nombreArchivo);
}
