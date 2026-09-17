// Tests de los esquemas de pedidos — no existían antes de la auditoría
// 2026-09-17. Cubre las reglas que más importan validar (mínimo de ítems,
// campos opcionales de envío/pago, y el mensaje de "sin selección" del
// bulk que se corrigió acá) para pescar una regresión si alguien afloja
// una validación sin querer.

import { describe, expect, it } from "vitest";
import { actualizarPedidoBulkSchema, actualizarPedidoSchema, crearPedidoSchema, type CrearPedidoInput } from "./pedido";

function item(overrides: Partial<CrearPedidoInput["items"][number]> = {}) {
  return {
    itemId: "p1::Blanco::c1",
    productoId: "p1",
    modelo: "AIKE",
    marca: "Volpe",
    color: "Blanco",
    curvaId: "c1",
    curvaRango: "35-40",
    codigoSap: "SAP-1",
    precio: 50,
    cantidadPorBulto: 12,
    esCalzado: true,
    cantidad: 1,
    stockDisponible: 5,
    ...overrides,
  };
}

function comprador() {
  return { nombre: "Juan Pérez", empresa: "Mayorista JP", telefono: "04121234567", rif: "J-12345678-9" };
}

describe("crearPedidoSchema", () => {
  it("acepta un pedido válido sin datos de envío (guardado silencioso de WhatsApp)", () => {
    const r = crearPedidoSchema.safeParse({ items: [item()], comprador: comprador(), total: 50 });
    expect(r.success).toBe(true);
  });

  it("acepta un pedido con metodoPago/metodoEnvio/direccionEnvio (Realizar pedido)", () => {
    const r = crearPedidoSchema.safeParse({
      items: [item()],
      comprador: comprador(),
      total: 50,
      metodoPago: "transferencia",
      metodoEnvio: "retiro_tienda",
      direccionEnvio: "Av. Principal, Caracas",
    });
    expect(r.success).toBe(true);
  });

  it("rechaza un pedido sin ítems", () => {
    const r = crearPedidoSchema.safeParse({ items: [], comprador: comprador(), total: 0 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toMatch(/no puede estar vacío/i);
  });

  it("rechaza un comprador incompleto", () => {
    const r = crearPedidoSchema.safeParse({
      items: [item()],
      comprador: { ...comprador(), rif: "" },
      total: 50,
    });
    expect(r.success).toBe(false);
  });

  it("rechaza un metodoPago fuera del catálogo permitido", () => {
    const r = crearPedidoSchema.safeParse({
      items: [item()],
      comprador: comprador(),
      total: 50,
      metodoPago: "criptomoneda",
    });
    expect(r.success).toBe(false);
  });
});

describe("actualizarPedidoSchema", () => {
  it("acepta un cambio de estado sin nota", () => {
    expect(actualizarPedidoSchema.safeParse({ estado: "enviado" }).success).toBe(true);
  });

  it("rechaza un estado fuera de los 5 vocabulario válidos", () => {
    expect(actualizarPedidoSchema.safeParse({ estado: "confirmado" }).success).toBe(false);
  });

  it("rechaza una nota de más de 500 caracteres", () => {
    const r = actualizarPedidoSchema.safeParse({ estado: "pendiente", notasAdmin: "a".repeat(501) });
    expect(r.success).toBe(false);
  });
});

describe("actualizarPedidoBulkSchema", () => {
  it("rechaza una lista de ids vacía con el mensaje que describe el estado, no una instrucción", () => {
    const r = actualizarPedidoBulkSchema.safeParse({ ids: [], estado: "enviado" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("No hay pedidos seleccionados para actualizar.");
  });

  it("rechaza un id que no es uuid", () => {
    const r = actualizarPedidoBulkSchema.safeParse({ ids: ["no-es-uuid"], estado: "enviado" });
    expect(r.success).toBe(false);
  });

  it("acepta una lista válida de ids", () => {
    // UUID v4 real (nibble de versión "4", nibble de variante "8") — un
    // UUID con ceros/unos repetidos sin esos nibbles correctos no pasa el
    // regex RFC4122 de z.string().uuid(), aunque "parezca" un uuid válido.
    const r = actualizarPedidoBulkSchema.safeParse({
      ids: ["11111111-1111-4111-8111-111111111111"],
      estado: "entregado",
    });
    expect(r.success).toBe(true);
  });
});
