-- Bloque "Nuestras marcas" del footer — antes un array estático en
-- src/lib/logosFooter.ts (public/marcas/*.png fijos en el repo), ahora
-- administrado desde /admin/configuracion: de 1 a 4 logos, cada uno con
-- nombre, imagen (Supabase Storage, bucket "publico") y visibilidad
-- independiente (ocultar sin borrar el archivo). Mismo patrón de
-- "reemplazo total" que "colecciones": el panel maneja alta/edición/
-- borrado/orden como una lista completa en memoria y la guarda de una vez
-- (ver guardarLogosFooter en lib/blob.ts).
--
-- RLS con "for all" desde el arranque (no "for update" separado de
-- "insert"): un upsert vía INSERT ... ON CONFLICT evalúa la política de
-- INSERT aun cuando termina resolviendo por UPDATE — el mismo bug que
-- obligó a corregir config_sitio y guia_tallas en la migración anterior
-- (20260915090000_fix_rls_upsert_config_sitio_guia_tallas.sql). Acá no hay
-- upsert (es delete + insert), pero se deja "for all" igual por
-- consistencia y porque cubre cualquier futuro cambio a upsert sin volver
-- a pisar esta misma piedra.
create table logos_footer (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  imagen_url text,
  visible boolean not null default true,
  orden integer not null default 0,
  creado_en timestamptz not null default now()
);

create index idx_logos_footer_orden on logos_footer(orden);

alter table logos_footer enable row level security;

create policy "publico_lee_logos_footer" on logos_footer for select using (true);

create policy "admin_escribe_logos_footer" on logos_footer for all
  using (es_admin_activo()) with check (es_admin_activo());

-- Semilla con los 3 logos que antes vivían fijos en public/marcas/*.png,
-- para que el footer no quede vacío justo después de aplicar esta
-- migración (imagen_url apunta al archivo estático de siempre hasta que el
-- admin los reemplace desde el panel por una URL de Storage).
insert into logos_footer (nombre, imagen_url, orden) values
  ('Volpe', '/marcas/volpe.png', 0),
  ('Vita Kids', '/marcas/vitakids.png', 1),
  ('Kriza', '/marcas/kriza.png', 2);
