export interface LatLng {
  lat: number;
  lng: number;
}

function dmsToDecimal(deg: number, min: number, sec: number, hemisphere: string): number {
  const decimal = deg + min / 60 + sec / 3600;
  return hemisphere === "S" || hemisphere === "W" ? -decimal : decimal;
}

// Acepta coordenadas pegadas desde Google Maps en dos formatos:
// decimal ("-30.219167, -61.970139") o grados/minutos/segundos
// ("30°13'09.0\"S 61°58'12.5\"W"), útil para ubicar clientes en zona rural
// donde la búsqueda por dirección no encuentra nada.
export function parseCoordinates(input: string): LatLng | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const decimalMatch = trimmed.match(
    /^(-?\d{1,3}(?:\.\d+)?)\s*[,\s]\s*(-?\d{1,3}(?:\.\d+)?)$/
  );
  if (decimalMatch) {
    const lat = parseFloat(decimalMatch[1]);
    const lng = parseFloat(decimalMatch[2]);
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng };
  }

  const dmsRegex = /(\d{1,3})\s*°\s*(\d{1,2})\s*['’]\s*([\d.]+)\s*["”]?\s*([NSEWnsew])/g;
  const matches = [...trimmed.matchAll(dmsRegex)];
  if (matches.length === 2) {
    let lat: number | null = null;
    let lng: number | null = null;
    for (const m of matches) {
      const deg = parseFloat(m[1]);
      const min = parseFloat(m[2]);
      const sec = parseFloat(m[3]);
      const hemisphere = m[4].toUpperCase();
      const value = dmsToDecimal(deg, min, sec, hemisphere);
      if (hemisphere === "N" || hemisphere === "S") lat = value;
      else lng = value;
    }
    if (lat != null && lng != null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return { lat, lng };
    }
  }

  return null;
}
