// Tests de transformarFilas (parseo SAP -> catálogo) — cubre expansión de
// curva (Serie+Curva -> tallas con reparto proporcional de disponible/
// disponibleFisico), agrupación en 3 niveles (curva -> color -> producto) y
// los casos borde documentados en los comentarios del propio módulo:
// filas duplicadas dentro de una curva, ausencia de la columna OnHand,
// colores sin foto, y colisión de slugs entre modelos.
//
// No cubre parseo de archivo (papaparse/xlsx) ni columnasGuia.ts — solo la
// función pura transformarFilas(), que es donde vive toda la lógica de
// negocio real de este módulo.

import { describe, expect, it } from "vitest";
import { esCalzado, transformarFilas, validarColumnas, type FilaOrigen } from "./transform";

function filaCalzado(overrides: Partial<FilaOrigen> = {}): FilaOrigen {
  return {
    ItemCode: "IT-001",
    U_PX_Modelo: "AIKE",
    U_PX_Color: "BLANCO",
    U_PX_Marca: "Volpe",
    U_PX_Rubro: "CALZADO",
    U_PX_Genero: "DAMA",
    "PV Fabrica": 50,
    U_PX_Serie: "35-37",
    U_PX_Curva: "2-3-1",
    "Disponible a Ofertar": 12,
    OnHand: 6,
    Foto: "https://cdn.shopify.com/a.jpg",
    ...overrides,
  };
}

function filaAccesorio(overrides: Partial<FilaOrigen> = {}): FilaOrigen {
  return {
    ItemCode: "IT-900",
    U_PX_Modelo: "CINTO CUERO",
    U_PX_Color: "NEGRO",
    U_PX_Marca: "Volpe",
    U_PX_Rubro: "ACCESORIOS",
    "PV Fabrica": 15,
    "Disponible a Ofertar": 8,
    OnHand: 8,
    Foto: "https://cdn.shopify.com/b.jpg",
    ...overrides,
  };
}

describe("esCalzado", () => {
  it("reconoce CALZADO sin importar mayúsculas/espacios", () => {
    expect(esCalzado("CALZADO")).toBe(true);
    expect(esCalzado(" calzado ")).toBe(true);
  });
  it("es false para otros rubros o valores ausentes", () => {
    expect(esCalzado("ACCESORIOS")).toBe(false);
    expect(esCalzado(null)).toBe(false);
    expect(esCalzado(undefined)).toBe(false);
    expect(esCalzado("")).toBe(false);
  });
});

describe("validarColumnas", () => {
  it("no reporta faltantes cuando están todas", () => {
    const encabezados = ["ItemCode", "U_PX_Modelo", "U_PX_Color", "U_PX_Marca", "U_PX_Rubro", "PV Fabrica", "Extra"];
    expect(validarColumnas(encabezados)).toEqual([]);
  });
  it("reporta exactamente las que faltan, ignorando espacios en el encabezado", () => {
    const encabezados = [" ItemCode ", "U_PX_Modelo", "U_PX_Marca"];
    expect(validarColumnas(encabezados)).toEqual(["U_PX_Color", "U_PX_Rubro", "PV Fabrica"]);
  });
});

describe("transformarFilas — expansión de curva (calzado)", () => {
  it("reparte disponible y disponibleFisico según la proporción de la curva", () => {
    const { catalogo, resumen } = transformarFilas([filaCalzado()], 1);
    expect(resumen.errores).toEqual([]);
    expect(catalogo).not.toBeNull();
    const tallas = catalogo!.productos[0].colores[0].curvas[0].tallas;
    expect(tallas).toEqual([
      { talla: "35", porBulto: 2, disponible: 4, disponibleFisico: 2 },
      { talla: "36", porBulto: 3, disponible: 6, disponibleFisico: 3 },
      { talla: "37", porBulto: 1, disponible: 2, disponibleFisico: 1 },
    ]);
  });

  it("cantidadPorBulto de la curva es la suma de porBulto de sus tallas", () => {
    const { catalogo } = transformarFilas([filaCalzado()], 1);
    expect(catalogo!.productos[0].colores[0].curvas[0].cantidadPorBulto).toBe(6);
  });

  it("disponibleFisico nunca supera a disponible, incluso si OnHand > Disponible a Ofertar", () => {
    const fila = filaCalzado({ "Disponible a Ofertar": 6, OnHand: 100, U_PX_Curva: "1-1-1" });
    const { catalogo } = transformarFilas([fila], 1);
    const tallas = catalogo!.productos[0].colores[0].curvas[0].tallas;
    for (const t of tallas) expect(t.disponibleFisico).toBeLessThanOrEqual(t.disponible);
  });

  it("rechaza la fila si Serie y Curva no tienen la misma cantidad de tallas", () => {
    const fila = filaCalzado({ U_PX_Serie: "35-38", U_PX_Curva: "1-1" }); // 4 tallas, 2 valores
    const { catalogo, resumen } = transformarFilas([fila], 1);
    expect(catalogo).toBeNull();
    expect(resumen.errores[0].motivo).toMatch(/Curva de tallas inconsistente/);
  });

  it("calzado sin Serie/Curva es error, no crash", () => {
    const fila = filaCalzado({ U_PX_Serie: "", U_PX_Curva: "" });
    const { catalogo, resumen } = transformarFilas([fila], 1);
    expect(catalogo).toBeNull();
    expect(resumen.errores[0].motivo).toMatch(/sin 'U_PX_Serie'\/'U_PX_Curva'/);
  });
});

describe("transformarFilas — columna OnHand ausente vs vacía", () => {
  it("si la columna OnHand no existe en el archivo, asume que todo lo ofertado ya es físico", () => {
    const fila = filaCalzado({ U_PX_Serie: "35-35", U_PX_Curva: "1", "Disponible a Ofertar": 5 });
    delete fila.OnHand;
    const { catalogo } = transformarFilas([fila], 1);
    const talla = catalogo!.productos[0].colores[0].curvas[0].tallas[0];
    expect(talla.disponible).toBe(5);
    expect(talla.disponibleFisico).toBe(5); // igual a disponible, no 0
  });

  it("si la columna OnHand existe pero la celda está vacía, asume 0 físico", () => {
    const fila = filaCalzado({ U_PX_Serie: "35-35", U_PX_Curva: "1", "Disponible a Ofertar": 5, OnHand: "" });
    const { catalogo } = transformarFilas([fila], 1);
    const talla = catalogo!.productos[0].colores[0].curvas[0].tallas[0];
    expect(talla.disponible).toBe(5);
    expect(talla.disponibleFisico).toBe(0);
  });
});

describe("transformarFilas — accesorios (sin curva)", () => {
  it("usa una talla única 'Único' con cantidadPorBulto 1", () => {
    const { catalogo } = transformarFilas([filaAccesorio()], 1);
    const curva = catalogo!.productos[0].colores[0].curvas[0];
    expect(curva.rango).toBe("Único");
    expect(curva.cantidadPorBulto).toBe(1);
    expect(curva.tallas).toEqual([{ talla: "Único", disponible: 8, disponibleFisico: 8 }]);
  });
});

describe("transformarFilas — agrupación en 3 niveles", () => {
  it("agrupa dos colores del mismo modelo en un solo producto, ordenados por nombre", () => {
    const filas = [
      filaCalzado({ ItemCode: "A1", U_PX_Color: "NEGRO" }),
      filaCalzado({ ItemCode: "A2", U_PX_Color: "BLANCO" }),
    ];
    const { catalogo } = transformarFilas(filas, 2);
    expect(catalogo!.productos).toHaveLength(1);
    expect(catalogo!.productos[0].colores.map((c) => c.color)).toEqual(["BLANCO", "NEGRO"]);
  });

  it("dos curvas (rangos de talla) del mismo modelo+color quedan separadas y ordenadas por rango", () => {
    const filas = [
      filaCalzado({ ItemCode: "B2", U_PX_Serie: "39-40", U_PX_Curva: "1-1" }),
      filaCalzado({ ItemCode: "B1", U_PX_Serie: "35-36", U_PX_Curva: "1-1" }),
    ];
    const { catalogo } = transformarFilas(filas, 2);
    const curvas = catalogo!.productos[0].colores[0].curvas;
    expect(curvas.map((c) => c.rango)).toEqual(["35-36", "39-40"]);
  });

  it("dos filas idénticas en la misma curva (duplicado) se combinan quedándose con el mayor disponible por talla", () => {
    const filas = [
      filaCalzado({ ItemCode: "C1", U_PX_Serie: "35-35", U_PX_Curva: "1", "Disponible a Ofertar": 3, OnHand: 3 }),
      filaCalzado({ ItemCode: "C1", U_PX_Serie: "35-35", U_PX_Curva: "1", "Disponible a Ofertar": 9, OnHand: 9 }),
    ];
    const { catalogo } = transformarFilas(filas, 2);
    expect(catalogo!.productos[0].colores[0].curvas).toHaveLength(1); // no se duplica la curva
    expect(catalogo!.productos[0].colores[0].curvas[0].tallas[0].disponible).toBe(9); // gana la mayor
  });
});

describe("transformarFilas — precio representativo del color", () => {
  it("usa el precio más frecuente entre las curvas del color", () => {
    const filas = [
      filaCalzado({ ItemCode: "D1", U_PX_Serie: "35-35", U_PX_Curva: "1", "PV Fabrica": 10 }),
      filaCalzado({ ItemCode: "D2", U_PX_Serie: "36-36", U_PX_Curva: "1", "PV Fabrica": 10 }),
      filaCalzado({ ItemCode: "D3", U_PX_Serie: "37-37", U_PX_Curva: "1", "PV Fabrica": 20 }),
    ];
    const { catalogo } = transformarFilas(filas, 3);
    expect(catalogo!.productos[0].colores[0].precio).toBe(10);
  });

  it("en empate de frecuencia, usa el menor precio", () => {
    const filas = [
      filaCalzado({ ItemCode: "E1", U_PX_Serie: "35-35", U_PX_Curva: "1", "PV Fabrica": 20 }),
      filaCalzado({ ItemCode: "E2", U_PX_Serie: "36-36", U_PX_Curva: "1", "PV Fabrica": 10 }),
    ];
    const { catalogo } = transformarFilas(filas, 2);
    expect(catalogo!.productos[0].colores[0].precio).toBe(10);
  });
});

describe("transformarFilas — validación de filas", () => {
  it("descarta en silencio filas con rubro vacío (relleno del export)", () => {
    const fila = filaCalzado({ U_PX_Rubro: "" });
    const { catalogo, resumen } = transformarFilas([fila], 1);
    expect(catalogo).toBeNull();
    expect(resumen.errores).toEqual([]); // sin error, no es un dato del usuario
  });

  it("reporta ItemCode/Modelo/Color/Precio faltantes con su motivo específico", () => {
    const casos: [Partial<FilaOrigen>, RegExp][] = [
      [{ ItemCode: "" }, /ItemCode/],
      [{ U_PX_Modelo: "" }, /U_PX_Modelo/],
      [{ U_PX_Color: "" }, /U_PX_Color/],
      [{ "PV Fabrica": "no-numero" }, /PV Fabrica/],
      [{ "PV Fabrica": -5 }, /PV Fabrica/],
    ];
    for (const [overrides, motivoEsperado] of casos) {
      const { resumen } = transformarFilas([filaCalzado(overrides)], 1);
      expect(resumen.errores[0].motivo).toMatch(motivoEsperado);
    }
  });

  it("excluye del catálogo un color sin ninguna foto real, sin tumbar el resto del import", () => {
    const filas = [
      filaCalzado({ ItemCode: "F1", Foto: "" }),
      filaCalzado({ ItemCode: "F2", U_PX_Modelo: "OTRO MODELO", Foto: "https://cdn.shopify.com/c.jpg" }),
    ];
    const { catalogo, resumen } = transformarFilas(filas, 2);
    expect(catalogo!.productos).toHaveLength(1);
    expect(catalogo!.productos[0].modelo).toBe("OTRO MODELO");
    expect(resumen.errores.some((e) => /sin foto/i.test(e.motivo))).toBe(true);
  });

  it("acepta varias URLs de foto separadas por coma y las deduplica", () => {
    const fila = filaCalzado({ Foto: "https://a.jpg, https://b.jpg, https://a.jpg" });
    const { catalogo } = transformarFilas([fila], 1);
    expect(catalogo!.productos[0].colores[0].fotos).toEqual(["https://a.jpg", "https://b.jpg"]);
  });

  it("prioriza U_LinkImagenChasea sobre Foto cuando ambas vienen con datos", () => {
    const fila = filaCalzado({ Foto: "https://foto-sap.jpg", U_LinkImagenChasea: "https://chasea.jpg" });
    const { catalogo } = transformarFilas([fila], 1);
    expect(catalogo!.productos[0].colores[0].fotos).toEqual(["https://chasea.jpg"]);
  });
});

describe("transformarFilas — ids y resumen", () => {
  it("dos modelos que generan el mismo slug reciben ids distintos", () => {
    const filas = [
      filaCalzado({ ItemCode: "G1", U_PX_Modelo: "Aike Classic" }),
      filaCalzado({ ItemCode: "G2", U_PX_Modelo: "Aike-Classic!!", U_PX_Color: "AZUL" }),
    ];
    const { catalogo } = transformarFilas(filas, 2);
    const ids = catalogo!.productos.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length); // sin colisión
    expect(ids).toContain("aike-classic");
    expect(ids).toContain("aike-classic-2");
  });

  it("totalProductos/totalVariantes del resumen coinciden con el catálogo generado", () => {
    const filas = [filaCalzado(), filaAccesorio()];
    const { catalogo, resumen } = transformarFilas(filas, 2);
    expect(resumen.totalProductos).toBe(catalogo!.totalProductos);
    expect(resumen.totalVariantes).toBe(catalogo!.totalVariantes);
    expect(resumen.ok).toBe(true);
  });

  it("sin ninguna fila válida, devuelve catálogo null y resumen con mensaje", () => {
    const { catalogo, resumen } = transformarFilas([], 0);
    expect(catalogo).toBeNull();
    expect(resumen.ok).toBe(false);
    expect(resumen.mensaje).toBeDefined();
  });
});
