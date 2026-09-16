-- =====================================================================
-- Umbral de "bajo stock" configurable POR PRODUCTO — Panel de Inventario
-- (/admin/inventario). Decisión explícita de Diego: el umbral es por
-- producto, no uno global para todo el catálogo.
--
-- Vive en una tabla APARTE de `productos` a propósito: cada carga/reimport
-- de SAP crea filas de `productos` completamente nuevas (carga_id nuevo) y
-- descarta las anteriores — un campo ahí se perdería en la próxima
-- importación. El umbral, en cambio, es una decisión de negocio del admin
-- que debe sobrevivir reimports, así que se indexa por `producto_slug`
-- (el identificador estable del modelo — mismo campo que ya usa
-- diffCatalogo.ts para comparar productos entre cargas), no por
-- productos.id.
--
-- Aplicar desde Supabase Dashboard -> SQL Editor (igual que el resto de
-- las migraciones de esta carpeta).
-- =====================================================================

create table umbrales_stock_producto (
  producto_slug text primary key,
  umbral integer not null default 10 check (umbral >= 0),
  actualizado_por uuid references auth.users(id),
  actualizado_en timestamptz not null default now()
);

alter table umbrales_stock_producto enable row level security;

-- Sin política de lectura pública a propósito: es un dato de gestión
-- interna del Panel de Inventario, el catálogo público no lo necesita (el
-- umbral solo colorea el badge "Bajo stock" ahí).
create policy "admin_lee_umbrales_stock" on umbrales_stock_producto for select
  using (es_admin_activo());
create policy "admin_escribe_umbrales_stock" on umbrales_stock_producto for all
  using (es_admin_activo()) with check (es_admin_activo());
