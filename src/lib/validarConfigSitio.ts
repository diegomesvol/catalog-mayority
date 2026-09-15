// Límites y validación de ConfigSitio (Propuesta 10) — un solo lugar para
// que el formulario del panel (ConfiguracionForm) y la API
// (/api/admin/config) validen exactamente lo mismo, sin que se desincronicen
// si alguno de los dos cambia a futuro.

export const WHATSAPP_VENTAS_MAX = 20; // dígitos + separadores que el admin haya tipeado, con margen
export const DESCRIPCION_EMPRESA_MAX = 300;
export const RIF_MAX = 20;
export const FONDO_LOGIN_URL_MAX = 2000; // margen generoso: puede ser una URL externa larga
export const LOGO_URL_MAX = 2000; // misma razón que FONDO_LOGIN_URL_MAX
export const RAZON_SOCIAL_MAX = 150;

export interface ErroresConfigSitio {
  whatsappVentas?: string;
  descripcionEmpresa?: string;
  rif?: string;
  fondoLoginUrl?: string;
  logoUrl?: string;
  razonSocial?: string;
}

// Los campos de texto ya recortados (trim) — vacío = "no configurado", no
// dispara validación de formato, solo de longitud (que ni recortado puede
// superar). razonSocial es la única excepción: es obligatoria (a diferencia
// del resto de ConfigSitio), así que vacía SÍ es un error.
export interface CamposConfigSitio {
  whatsappVentas: string;
  descripcionEmpresa: string;
  rif: string;
  fondoLoginUrl: string;
  logoUrl: string;
  razonSocial: string;
}

export function validarConfigSitio(campos: CamposConfigSitio): ErroresConfigSitio {
  const errores: ErroresConfigSitio = {};

  if (campos.whatsappVentas.length > WHATSAPP_VENTAS_MAX) {
    errores.whatsappVentas = `Máximo ${WHATSAPP_VENTAS_MAX} caracteres.`;
  } else if (campos.whatsappVentas && campos.whatsappVentas.replace(/\D/g, "").length < 10) {
    errores.whatsappVentas = "Debe tener al menos 10 dígitos (formato internacional, sin “+” ni espacios).";
  }

  if (campos.descripcionEmpresa.length > DESCRIPCION_EMPRESA_MAX) {
    errores.descripcionEmpresa = `Máximo ${DESCRIPCION_EMPRESA_MAX} caracteres.`;
  }

  if (campos.rif.length > RIF_MAX) {
    errores.rif = `Máximo ${RIF_MAX} caracteres.`;
  }

  // La subida por archivo ya llega convertida en una URL propia
  // ("/api/imagenes/login/…") — esta validación es sobre todo para cuando
  // el admin pega una URL externa a mano: que al menos tenga forma de URL,
  // para no guardar un valor que después rompe silenciosamente el fondo del
  // login.
  if (campos.fondoLoginUrl.length > FONDO_LOGIN_URL_MAX) {
    errores.fondoLoginUrl = `Máximo ${FONDO_LOGIN_URL_MAX} caracteres.`;
  } else if (campos.fondoLoginUrl && !esUrlOInterna(campos.fondoLoginUrl)) {
    errores.fondoLoginUrl = "Tiene que ser una URL válida (o subir un archivo).";
  }

  if (campos.logoUrl.length > LOGO_URL_MAX) {
    errores.logoUrl = `Máximo ${LOGO_URL_MAX} caracteres.`;
  } else if (campos.logoUrl && !esUrlOInterna(campos.logoUrl)) {
    errores.logoUrl = "Tiene que ser una URL válida (o subir un archivo).";
  }

  if (!campos.razonSocial) {
    errores.razonSocial = "La razón social es obligatoria.";
  } else if (campos.razonSocial.length > RAZON_SOCIAL_MAX) {
    errores.razonSocial = `Máximo ${RAZON_SOCIAL_MAX} caracteres.`;
  }

  return errores;
}

function esUrlOInterna(valor: string): boolean {
  if (valor.startsWith("/")) return true; // "/api/imagenes/login/…" (subida por archivo)
  try {
    const url = new URL(valor);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
