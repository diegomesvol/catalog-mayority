// Esquema de POST /api/cliente/pedidos — valida el snapshot que manda el
// carrito (ItemCarrito[] + DatosComprador, ver lib/carrito.ts) antes de
// guardarlo. No repite las reglas de negocio del carrito (stock, etc.):
// esto es persistencia de lo que el cliente ya armó y confirmó enviar por
// WhatsApp, no una validación de disponibilidad — si algo cambió del lado
// del catálogo entre que se armó el carrito y se envía, es un caso aparte
// que no bloquea el registro del pedido.

import { z } from "zod";

// Mismo shape que ItemCarrito (lib/carrito.ts) — se valida acá tal cual
// porque es lo que el cliente (navegador) manda, sin volver a tocar el
// catálogo del lado del servidor (ver nota arriba).
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

export const crearPedidoSchema = z.object({
  items: z.array(itemPedidoSchema).min(1, "El pedido no puede estar vacío."),
  comprador: compradorPedidoSchema,
  total: z.number().nonnegative(),
});

export type CrearPedidoInput = z.infer<typeof crearPedidoSchema>;

// PATCH /api/admin/pedidos/[id] — el admin hace seguimiento del pedido.
export const actualizarPedidoSchema = z.object({
  estado: z.enum(["pendiente", "confirmado", "despachado", "cancelado"]),
  notasAdmin: z.string().trim().max(500, "Máximo 500 caracteres.").optional(),
});

export type ActualizarPedidoInput = z.infer<typeof actualizarPedidoSchema>;
