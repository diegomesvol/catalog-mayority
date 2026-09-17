// Logging centralizado de errores. Un solo formato, en español, pensado
// para leerse directo sin ayuda externa:
//  - En el servidor (route handlers), llega a los "Runtime Logs" de Vercel
//    (Deployments → el deployment activo → pestaña Logs, o Observability).
//  - En el navegador, llega a la consola de DevTools (F12 → Console).
//
// Uso: logError("contexto corto", error, "pista opcional de cómo resolverlo").
// El contexto identifica DÓNDE pasó (ej. "api/admin/upload-token"), el
// mensaje de error explica QUÉ pasó, y la pista (cuando se puede deducir)
// explica CÓMO resolverlo — sin tener que preguntar.

export function logError(contexto: string, error: unknown, pista?: string): void {
  const mensaje = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const lineas = [`🔴 [${contexto}] ${mensaje}`];
  if (pista) lineas.push(`   → Cómo resolverlo: ${pista}`);
  if (stack) lineas.push(`   → Detalle técnico:\n${stack}`);

  console.error(lineas.join("\n"));
}

/**
 * Diagnóstico automático para errores de Supabase Storage: varios mensajes
 * del SDK son crípticos fuera de contexto — acá se traducen a una pista
 * accionable cuando el texto del error los delata. Antes apuntaba a Vercel
 * Blob (BLOB_READ_WRITE_TOKEN, etc.) — el proyecto migró por completo a
 * Supabase Storage (ver la nota al inicio de lib/blob.ts) y esa pista ya no
 * aplicaba a ningún error real; quedaba mostrando una solución de un
 * proveedor que este proyecto ya no usa. Reescrita 2026-09-17 (auditoría).
 */
export function pistaBlob(mensaje: string): string | undefined {
  if (/bucket.*not.*found|not_found.*bucket/i.test(mensaje)) {
    return (
      "El bucket de Storage no existe o tiene otro nombre en este proyecto de Supabase. " +
      "Revisá Supabase Dashboard → Storage → que exista el bucket 'publico' (o 'privado' " +
      "para el original del catálogo) y que el nombre coincida con BUCKET_PUBLICO en lib/blob.ts."
    );
  }
  if (/row-level security|permission denied|new row violates row-level security/i.test(mensaje)) {
    return (
      "RLS de Storage rechazó la operación — la sesión del admin no tiene permiso de " +
      "escritura sobre ese bucket/carpeta, o expiró. Revisá las políticas de storage.objects " +
      "para el bucket correspondiente y que la cookie de sesión siga siendo válida."
    );
  }
  if (/Object not found|400.*not found/i.test(mensaje)) {
    return "El archivo no existe en Storage — normal si ya se había borrado o si es la primera carga, no requiere acción.";
  }
  if (/exceeded the maximum allowed size|Payload too large/i.test(mensaje)) {
    return "El archivo supera el límite de tamaño configurado en el bucket de Supabase Storage (revisar en Dashboard → Storage → el bucket → Settings).";
  }
  if (/Invalid key|Invalid path/i.test(mensaje)) {
    return "La ruta del archivo tiene caracteres no válidos para Storage (Supabase es más estricto que el sistema de archivos local con el nombre de los objetos).";
  }
  return undefined;
}
