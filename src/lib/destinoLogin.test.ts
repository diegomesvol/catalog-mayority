import { describe, expect, it } from "vitest";
import { destinoPostLogin } from "./destinoLogin";

describe("destinoPostLogin", () => {
  it("acepta rutas internas del mismo portal", () => {
    expect(destinoPostLogin("/cliente/pedidos/abc", "/cliente")).toBe("/cliente/pedidos/abc");
    expect(destinoPostLogin("/admin/catalogo", "/admin")).toBe("/admin/catalogo");
  });

  it("rechaza open redirects, otro portal y rutas de login", () => {
    for (const next of ["//evil.com", "/\\evil.com", "https://evil.com", "/admin", "/clientex", "/cliente/login", null]) {
      expect(destinoPostLogin(next, "/cliente")).toBe("/cliente");
    }
  });
});
