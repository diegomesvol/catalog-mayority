import { describe, expect, it } from "vitest";
import { unidadesDisponiblesCurva } from "./producto";
import type { Curva, TallaVariante } from "./types";

function talla(overrides: Partial<TallaVariante> = {}): TallaVariante {
  return { talla: "38", disponible: 10, disponibleFisico: 10, porBulto: 1, ...overrides };
}

function curva(tallas: TallaVariante[]): Curva {
  return { id: "c1", rango: "35-40", codigoSap: "SAP1", cantidadPorBulto: 1, tallas };
}

describe("unidadesDisponiblesCurva", () => {
  it("con porBulto uniforme, el tope es el mínimo de disponible/porBulto entre tallas", () => {
    const c = curva([
      talla({ talla: "35", disponible: 10, porBulto: 1 }),
      talla({ talla: "36", disponible: 4, porBulto: 2 }), // 4/2 = 2 bultos -> el más chico
      talla({ talla: "37", disponible: 9, porBulto: 3 }), // 9/3 = 3 bultos
    ]);
    expect(unidadesDisponiblesCurva(c)).toBe(2);
  });

  it("redondea hacia abajo cuando el stock no alcanza para un bulto completo", () => {
    const c = curva([talla({ disponible: 5, porBulto: 3 })]); // 5/3 = 1.67 -> 1
    expect(unidadesDisponiblesCurva(c)).toBe(1);
  });

  it("ignora tallas con porBulto 0 (no forman parte del patrón) en vez de dar NaN", () => {
    const c = curva([
      talla({ talla: "35", disponible: 0, porBulto: 0 }), // no limita
      talla({ talla: "36", disponible: 6, porBulto: 2 }), // 6/2 = 3
    ]);
    expect(unidadesDisponiblesCurva(c)).toBe(3);
  });

  it("accesorios (talla Único sin porBulto) equivale directo al disponible", () => {
    const c = curva([{ talla: "Único", disponible: 7, disponibleFisico: 7 }]);
    expect(unidadesDisponiblesCurva(c)).toBe(7);
  });

  it("sin stock en ninguna talla, el tope es 0", () => {
    const c = curva([talla({ disponible: 0, porBulto: 1 }), talla({ disponible: 0, porBulto: 2 })]);
    expect(unidadesDisponiblesCurva(c)).toBe(0);
  });

  it("curva sin tallas devuelve 0", () => {
    expect(unidadesDisponiblesCurva(curva([]))).toBe(0);
  });
});
