// Validación de las mutaciones del Panel de Inventario (/admin/inventario)
// — ver la nota grande en lib/blob.ts (sección Inventario) para por qué el
// stock se edita directo sobre la carga activa y el umbral vive aparte.

import { z } from "zod";

// PATCH /api/admin/inventario/talla/[id] — edición rápida de stock desde el
// modal (una fila por color+curva+talla). El modal solo deja tocar
// "disponible": disponibleFisico se recalcula solo en el cliente
// (min(físico actual, nuevo disponible), ver InventarioEditarModal.tsx) para
// no duplicar el mismo número en dos inputs — pero igual se valida acá
// completo, la API no confía únicamente en lo que mandó el cliente.
export const actualizarTallaSchema = z
  .object({
    disponible: z.number().int("Debe ser un número entero.").min(0, "No puede ser negativo."),
    disponibleFisico: z.number().int("Debe ser un número entero.").min(0, "No puede ser negativo."),
  })
  .refine((d) => d.disponibleFisico <= d.disponible, {
    message: "Lo físico no puede superar el total disponible (físico + en tránsito).",
    path: ["disponibleFisico"],
  });

export type ActualizarTallaInput = z.infer<typeof actualizarTallaSchema>;

// POST /api/admin/inventario/agotar-masivo — bulk action de la barra de
// selección múltiple: pone en 0 el stock de TODAS las tallas de los
// productos seleccionados.
export const agotarMasivoSchema = z.object({
  tallaIds: z.array(z.string().min(1)).min(1, "No hay tallas para actualizar."),
});

export type AgotarMasivoInput = z.infer<typeof agotarMasivoSchema>;

// PUT /api/admin/inventario/umbrales — umbral de "bajo stock" de UN producto.
export const umbralStockSchema = z.object({
  slug: z.string().min(1),
  umbral: z.number().int("Debe ser un número entero.").min(0, "No puede ser negativo."),
});

export type UmbralStockInput = z.infer<typeof umbralStockSchema>;
