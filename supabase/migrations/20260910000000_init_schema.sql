-- =====================================================================
-- Catálogo Mayorista Mesvol — schema inicial en Supabase (Postgres).
-- Reemplaza el modelo actual (JSON planos en Vercel Blob, ver
-- src/lib/blob.ts) por tablas relacionales + Supabase Auth para
-- multi-admin con roles.
--
-- Aplicar desde Supabase Dashboard -> SQL Editor (pegar y correr), o
-- vía `supabase db push` si más adelante se adopta el CLI.
-- =====================================================================

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ---------------------------------------------------------------------
-- 1. Cargas = versiones del catálogo. Reemplaza el patrón
--    catalogo.json / catalogo-pending.json / catalogo-backup.json de
--    blob.ts: cada carga es una versión completa e inmutable; publicar
--    es solo mover un puntero (ver catalogo_activo) dentro de una
--    transacción — sin duplicar JSON para el "backup".
-- ---------------------------------------------------------------------
create type estado_carga as enum ('pendiente', 'publicada', 'descartada');
create type origen_carga as enum ('archivo', 'google_sheets', 'revertir');

create table cargas (
  id uuid primary key default gen_random_uuid(),
  estado estado_carga not null default 'pendiente',
  origen origen_carga not null,
  nombre_archivo text,
  total_productos integer not null default 0,
  total_variantes integer not null default 0,
  total_errores integer not null default 0,
  total_sin_foto integer not null default 0,
  errores jsonb not null default '[]'::jsonb, -- ErrorImportacion[] (types.ts), igual que hoy
  creado_por uuid references auth.users(id),
  creado_en timestamptz not null default now()
);
create index idx_cargas_estado on cargas(estado, creado_en desc);

-- Fila única: qué carga es la publicada ahora mismo. Revertir = un solo
-- UPDATE de este puntero a una carga anterior (no hay que restaurar nada).
create table catalogo_activo (
  id boolean primary key default true,
  carga_id uuid references cargas(id),
  constraint una_sola_fila check (id)
);
insert into catalogo_activo (id, carga_id) values (true, null);

-- ---------------------------------------------------------------------
-- 2. Catálogo normalizado — misma jerarquía que Producto -> VarianteColor
--    -> Curva -> TallaVariante en src/lib/types.ts.
-- ---------------------------------------------------------------------
create table productos (
  id uuid primary key default gen_random_uuid(),
  carga_id uuid not null references cargas(id) on delete cascade,
  slug text not null,
  modelo text not null,
  marca text not null,
  genero text not null,
  rubro text not null,
  linea text,
  codigo_modelo text,
  material_exterior text,
  material_interior text,
  material_suela text,
  tipo_calzado text,
  unique (carga_id, slug)
);
create index idx_productos_carga on productos(carga_id);
create index idx_productos_filtros on productos(carga_id, marca, rubro, genero);

create table variantes_color (
  id uuid primary key default gen_random_uuid(),
  producto_id uuid not null references productos(id) on delete cascade,
  color text not null,
  precio numeric(10,2) not null,
  promocion boolean not null default false,
  fotos jsonb not null default '[]'::jsonb
);
create index idx_variantes_producto on variantes_color(producto_id);

create table curvas (
  id uuid primary key default gen_random_uuid(),
  variante_id uuid not null references variantes_color(id) on delete cascade,
  rango text not null,
  codigo_sap text not null,
  cantidad_por_bulto integer not null default 0
);
create index idx_curvas_variante on curvas(variante_id);

create table tallas (
  id uuid primary key default gen_random_uuid(),
  curva_id uuid not null references curvas(id) on delete cascade,
  talla text not null,
  disponible integer not null default 0,
  disponible_fisico integer not null default 0,
  por_bulto integer
);
create index idx_tallas_curva on tallas(curva_id);

-- ---------------------------------------------------------------------
-- 3. Config operativa — antes JSON sueltos en Blob (guia-tallas.json,
--    colecciones.json, config-sitio.json).
-- ---------------------------------------------------------------------
create table guia_tallas (
  id boolean primary key default true,
  instrucciones_url text,
  tabla_url text,
  actualizado_por uuid references auth.users(id),
  actualizado_en timestamptz not null default now(),
  constraint una_sola_fila check (id)
);
insert into guia_tallas (id) values (true);

create table config_sitio (
  id boolean primary key default true,
  whatsapp_ventas text,
  descripcion_empresa text,
  rif text,
  actualizado_por uuid references auth.users(id),
  actualizado_en timestamptz not null default now(),
  constraint una_sola_fila check (id)
);
insert into config_sitio (id) values (true);

create table colecciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  imagen_url text,
  filtro jsonb not null default '{}'::jsonb, -- FiltroColeccion (types.ts)
  orden integer not null default 0,
  creado_en timestamptz not null default now()
);
create index idx_colecciones_orden on colecciones(orden);

-- ---------------------------------------------------------------------
-- 4. Admins — Supabase Auth (auth.users) + perfil/rol propio. Sustituye
--    por completo src/lib/auth.ts (password único + cookie HMAC).
-- ---------------------------------------------------------------------
create type rol_admin as enum ('superadmin', 'admin', 'editor');

create table admin_perfiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  rol rol_admin not null default 'admin',
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create function es_admin_activo() returns boolean
language sql security definer stable as $$
  select exists (
    select 1 from admin_perfiles
    where user_id = auth.uid() and activo = true
  );
$$;

-- ---------------------------------------------------------------------
-- 5. RLS — el sitio público (anon) solo puede LEER lo publicado; solo
--    admins activos pueden escribir. PostgREST resuelve el anidado
--    Producto->colores->curvas->tallas vía embedding por FK (sin vista
--    manual): select=*,colores:variantes_color(*,curvas(*,tallas(*)))
-- ---------------------------------------------------------------------
alter table cargas enable row level security;
alter table catalogo_activo enable row level security;
alter table productos enable row level security;
alter table variantes_color enable row level security;
alter table curvas enable row level security;
alter table tallas enable row level security;
alter table guia_tallas enable row level security;
alter table config_sitio enable row level security;
alter table colecciones enable row level security;
alter table admin_perfiles enable row level security;

-- Lectura pública: solo la carga activa.
create policy "publico_lee_puntero" on catalogo_activo for select using (true);
create policy "publico_lee_productos" on productos for select
  using (carga_id = (select carga_id from catalogo_activo));
create policy "publico_lee_variantes" on variantes_color for select
  using (producto_id in (select id from productos where carga_id = (select carga_id from catalogo_activo)));
create policy "publico_lee_curvas" on curvas for select
  using (variante_id in (select id from variantes_color));
create policy "publico_lee_tallas" on tallas for select
  using (curva_id in (select id from curvas));
create policy "publico_lee_guia_tallas" on guia_tallas for select using (true);
create policy "publico_lee_config_sitio" on config_sitio for select using (true);
create policy "publico_lee_colecciones" on colecciones for select using (true);

-- Escritura: solo admins activos (todas las tablas de gestión).
create policy "admin_escribe_cargas" on cargas for all
  using (es_admin_activo()) with check (es_admin_activo());
create policy "admin_escribe_puntero" on catalogo_activo for update
  using (es_admin_activo()) with check (es_admin_activo());
create policy "admin_escribe_productos" on productos for all
  using (es_admin_activo()) with check (es_admin_activo());
create policy "admin_escribe_variantes" on variantes_color for all
  using (es_admin_activo()) with check (es_admin_activo());
create policy "admin_escribe_curvas" on curvas for all
  using (es_admin_activo()) with check (es_admin_activo());
create policy "admin_escribe_tallas" on tallas for all
  using (es_admin_activo()) with check (es_admin_activo());
create policy "admin_escribe_guia_tallas" on guia_tallas for update
  using (es_admin_activo()) with check (es_admin_activo());
create policy "admin_escribe_config_sitio" on config_sitio for update
  using (es_admin_activo()) with check (es_admin_activo());
create policy "admin_escribe_colecciones" on colecciones for all
  using (es_admin_activo()) with check (es_admin_activo());

-- admin_perfiles: cada quien ve su propia fila; solo superadmin gestiona todas.
create policy "propio_perfil" on admin_perfiles for select using (user_id = auth.uid());
create policy "superadmin_gestiona_perfiles" on admin_perfiles for all
  using (exists (select 1 from admin_perfiles ap where ap.user_id = auth.uid() and ap.rol = 'superadmin' and ap.activo))
  with check (exists (select 1 from admin_perfiles ap where ap.user_id = auth.uid() and ap.rol = 'superadmin' and ap.activo));
