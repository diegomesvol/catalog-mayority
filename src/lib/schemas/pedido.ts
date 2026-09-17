// Esquemas y vocabulario de pedidos — fuente única de la verdad para los 5
// estados y los métodos de pago/envío, usada por: el POST/PATCH de esta API,
// el módulo de Gestión de Pedidos del admin, las páginas de pedidos del
// cliente y el PDF de nota de entrega (evita que cada uno redefina su propia
// lista, como pasaba antes con 4 copias sueltas de "Estado").

import { z } from "zod";
import { METODOS_PAGO_OPCIONES } from "./perfilCliente";

// Mismo orden en que se muestran en el panel admin y en el timeline del
// cliente. "en_proceso"/"enviado" reemplazan a los viejos "confirmado"/
// "despachado" (ver migración 20260916020000_pedidos_estados_y_checkout.sql)
// y se agrega "entregado" — 5 estados en vez de 4.
export const ESTADOS_PEDIDO = ["pendiente", "en_proceso", "enviado", "entregado", "cancelado"] as const;
export type EstadoPedido = (typeof ESTADOS_PEDIDO)[number];

export const ESTADO_PEDIDO_ETIQUETA: Record<EstadoPedido, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  enviado: "Enviado",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

// Sin lista propia de "tipo de cliente" (mayorista/detal): este proyecto no
// tiene esa distinción en ningún lado del modelo de datos — toda la base de
// clientes es mayorista (confirmado con Diego).

// Reexportado acá para que el checkout y el admin no tengan que importar de
// perfilCliente.ts para lo que en el fondo es "método de pago de un pedido".
export { METODOS_PAGO_OPCIONES, METODOS_PAGO_ETIQUETA, type MetodoPago } from "./perfilCliente";

// Método de envío del pedido — no existía ningún catálogo previo (es un dato
// nuevo, pedido explícitamente por Diego). Lista inicial razonable para el
// negocio; ajustable sin tocar más que este archivo si Diego pide otras
// opciones.
export const METODOS_ENVIO_OPCIONES = ["retiro_tienda", "encomienda_nacional", "transporte_propio", "otro"] as const;
export type MetodoEnvio = (typeof METODOS_ENVIO_OPCIONES)[number];

export const METODOS_ENVIO_ETIQUETA: Record<MetodoEnvio, string> = {
  retiro_tienda: "Retiro en tienda",
  encomienda_nacional: "Encomienda nacional",
  transporte_propio: "Transporte propio del cliente",
  otro: "Otro / a coordinar",
};

// Mismo shape que ItemCarrito (lib/carrito.ts) — se valida acá tal cual
// porque es lo que el cliente (navegador) manda, sin volver a tocar el
// catálogo del lado del servidor (eso lo hace recalcularPedido aparte).
const itemPedidoSchema = z.object({
  itemId: z.string().min(1),
  productoId: z.string().min(1),
  modelo: z.string(),
  marca: z.string(),
  color: z.string(),
  curvaId: z.string(),
  curvaRango: z.string(),
  codigoSap: z.string(),
  foto: z.string().optional(),
  precio: z.number().nonnegative(),
  cantidadPorBulto: z.number().int().nonnegative(),
  esCalzado: z.boolean(),
  cantidad: z.number().int().positive(),
  stockDisponible: z.number().int().nonnegative(),
});

const compradorPedidoSchema = z.object({
  nombre: z.string().trim().min(1, "Falta el nombre."),
  empresa: z.string().trim().min(1, "Falta la empresa."),
  telefono: z.string().trim().min(1, "Falta el teléfono."),
  rif: z.string().trim().min(1, "Falta el RIF."),
});

// metodoPago/metodoEnvio/direccionEnvio: opcionales acá a propósito. El
// mismo endpoint recibe tanto el "Realizar pedido" (donde el front SÍ exige
// completarlos, ver usePedidoWhatsApp.validarEnvio) como el guardado
// silencioso que se dispara junto con "Enviar por WhatsApp" (que nunca debe
// bloquearse por esto) — la API acepta ambos casos y guarda null si faltan.
export const crearPedidoSchema = z.object({
  items: z.array(itemPedidoSchema).min(1, "El pedido no puede estar vacío."),
  comprador: compradorPedidoSchema,
  total: z.number().nonnegative(),
  metodoPago: z.enum(METODOS_PAGO_OPCIONES).optional(),
  metodoEnvio: z.enum(METODOS_ENVIO_OPCIONES).optional(),
  direccionEnvio: z.string().trim().min(1).optional(),
});

export type CrearPedidoInput = z.infer<typeof crearPedidoSchema>;

// PATCH /api/admin/pedidos/[id] — el admin hace seguimiento del pedido.
export const actualizarPedidoSchema = z.object({
  estado: z.enum(ESTADOS_PEDIDO),
  notasAdmin: z.string().trim().max(500, "Máximo 500 caracteres.").optional(),
});

export type ActualizarPedidoInput = z.infer<typeof actualizarPedidoSchema>;

// POST /api/admin/pedidos/bulk — cambio de estado en lote (acción masiva de
// la tabla de pedidos). Sin notasAdmin: una nota en lote no tiene sentido
// (son pedidos distintos), eso se sigue editando pedido por pedido.
export const actualizarPedidoBulkSchema = z.object({
  ids: z.array(z.string().uuid()).min(1, "Seleccioná al menos un pedido."),
  estado: z.enum(ESTADOS_PEDIDO),
});

export type ActualizarPedidoBulkInput = z.infer<typeof actualizarPedidoBulkSchema>;
