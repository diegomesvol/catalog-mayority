import { describe, expect, it } from "vitest";
import { recalcularPedido, resolverItems } from "./pedidoServidor";
import type { Catalogo } from "./types";

const catalogo: Catalogo = {
  generadoEn: "2026-09-16T00:00:00.000Z",
  totalProductos: 1,
  totalVariantes: 1,
  productos: [
    {
      id: "aike",
      modelo: "AIKE",
      marca: "VOLPE",
      genero: "DAMA",
      rubro: "CALZADO",
      colores: [
        {
          color: "NEGRO",
          precio: 12.5,
          promocion: false,
          fotos: ["https://cdn.shopify.com/a.jpg"],
          curvas: [
            {
              id: "35-40",
              rango: "35-40",
              codigoSap: "SAP-1",
              cantidadPorBulto: 12,
              tallas: [{ talla: "35", disponible: 24, disponibleFisico: 24, porBulto: 12 }],
            },
          ],
        },
      ],
    },
  ],
};

describe("recalcularPedido", () => {
  it("ignora el precio del cliente y usa el del catálogo", () => {
    const r = recalcularPedido(catalogo, [
      { productoId: "aike", color: "NEGRO", curvaId: "35-40", cantidad: 2, precio: 0 } as never,
    ]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.items[0].precio).toBe(12.5);
    expect(r.items[0].codigoSap).toBe("SAP-1");
    expect(r.items[0].esCalzado).toBe(true);
    expect(r.total).toBe(300); // 12.5 * 12 pares * 2 bultos
  });

  it("rechaza ítems que no existen en el catálogo vigente", () => {
    const r = recalcularPedido(catalogo, [{ productoId: "aike", color: "ROJO", curvaId: "35-40", cantidad: 1 }]);
    expect(r.ok).toBe(false);
  });
});

describe("resolverItems", () => {
  it("separa las líneas vigentes de las que ya no existen", () => {
    const { items, faltantes } = resolverItems(catalogo, [
      { productoId: "aike", color: "NEGRO", curvaId: "35-40", cantidad: 1 },
      { productoId: "borrado", color: "NEGRO", curvaId: "35-40", cantidad: 1 },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0].itemId).toBe("aike::NEGRO::35-40");
    expect(items[0].stockDisponible).toBe(2);
    expect(faltantes.map((f) => f.productoId)).toEqual(["borrado"]);
  });
});
