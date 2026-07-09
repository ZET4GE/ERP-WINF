import { describe, expect, it } from "vitest";

import { parseCoordinates } from "./geo";

describe("parseCoordinates", () => {
  it("parsea coordenadas decimales separadas por coma", () => {
    expect(parseCoordinates("-30.219167, -61.970139")).toEqual({
      lat: -30.219167,
      lng: -61.970139,
    });
  });

  it("parsea coordenadas decimales separadas por espacio", () => {
    expect(parseCoordinates("-30.219167 -61.970139")).toEqual({
      lat: -30.219167,
      lng: -61.970139,
    });
  });

  it("parsea coordenadas en formato grados/minutos/segundos de Google Maps", () => {
    const result = parseCoordinates(`30°13'09.0"S 61°58'12.5"W`);
    expect(result).not.toBeNull();
    expect(result!.lat).toBeCloseTo(-30.21917, 4);
    expect(result!.lng).toBeCloseTo(-61.97014, 4);
  });

  it("devuelve null para texto inválido", () => {
    expect(parseCoordinates("zona rural, villa trinidad")).toBeNull();
  });

  it("devuelve null si el rango de lat/lng es imposible", () => {
    expect(parseCoordinates("200, 50")).toBeNull();
  });
});
