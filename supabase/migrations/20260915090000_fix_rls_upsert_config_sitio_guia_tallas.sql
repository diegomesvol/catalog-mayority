-- Bug preexistente (no introducido por la migración de branding): config_sitio
-- y guia_tallas son tablas singleton (fila fija id=true) que se escriben con
-- upsert (INSERT ... ON CONFLICT DO UPDATE) desde guardarConfigSitio/
-- guardarGuiaTallas (lib/blob.ts). Postgres evalúa la policy de INSERT
-- primero SIEMPRE en un upsert, aunque la fila termine resolviendo por
-- UPDATE — y ambas tablas solo tenían policy "for update", nunca "for
-- insert", así que todo upsert fallaba con "new row violates row-level
-- security policy" apenas alguien intentaba guardar. Se reemplaza "for
-- update" por "for all" (mismo patrón que admin_escribe_colecciones/
-- admin_escribe_cargas, etc.) — cubre insert+update+delete con la misma
-- condición de siempre (es_admin_activo()).
drop policy "admin_escribe_config_sitio" on config_sitio;
create policy "admin_escribe_config_sitio" on config_sitio for all
  using (es_admin_activo()) with check (es_admin_activo());

drop policy "admin_escribe_guia_tallas" on guia_tallas;
create policy "admin_escribe_guia_tallas" on guia_tallas for all
  using (es_admin_activo()) with check (es_admin_activo());
