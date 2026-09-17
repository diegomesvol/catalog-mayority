// Tests de formatearFecha/formatearFechaHora — centralizadas en la
// auditoría 2026-09-17 (antes eran 5 copias sueltas del mismo
// new Date().toLocaleString con distintas combinaciones de "short"/"long").
// Cubre que el formato por defecto y el override de mes sigan dando el
// resultado que cada pantalla necesita, para pescar una regresión si
// alguien toca este archivo más adelante.

import { describe, expect, it } from "vitest";
import { formatearFecha, formatearFechaHora, formatearPrecio } from "./format";

const ISO = "2026-09-16T14:30:00.000Z";

describe("formatearFecha", () => {
  it("usa mes corto por defecto (cliente/page.tsx, ClientesAdmin.tsx)", () => {
    expect(formatearFecha(ISO)).toMatch(/sept?\.?/i);
  });

  it("usa mes largo cuando se pide (cliente/pedidos/[id]/page.tsx)", () => {
    const resultado = formatearFecha(ISO, { mes: "long" });
    expect(resultado.toLowerCase()).toContain("septiembre");
  });
});

describe("formatearFechaHora", () => {
  it("incluye hora y minutos además de la fecha", () => {
    const resultado = formatearFechaHora(ISO);
    expect(resultado).toMatch(/\d{1,2}:\d{2}/);
  });

  it("acepta mes largo (PedidoDetalleModal) sin perder la hora", () => {
    const resultado = formatearFechaHora(ISO, { mes: "long" });
    expect(resultado.toLowerCase()).toContain("septiembre");
    expect(resultado).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe("formatearPrecio", () => {
  it("formatea en USD con 2 decimales", () => {
    expect(formatearPrecio(1234.5)).toBe("$1,234.50");
  });
});
