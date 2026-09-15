-- =====================================================================
-- RBAC real (rol admin/editor ya no es decorativo) + modo demo/solo-lectura
-- + Cliente/Pedidos. Ver plan acordado con Diego (chat, RBAC panel admin).
--
-- Aplicado directo contra el proyecto real vía Supabase MCP el 2026-09-14
-- (igual que el resto del schema — ver la nota en
-- 20260910000000_init_schema.sql sobre aplicar desde SQL Editor/MCP en vez
-- de `supabase db push`). Este archivo es el respaldo versionado de esos
-- dos ALTER/CREATE que ya corrieron en producción — no hace falta
-- volver a correrlo, pero mantiene el repo sincronizado con la base real
-- (que ya se había desincronizado una vez: catalogo_lock y
-- es_superadmin_activo() no estaban en ningún archivo del repo).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Modo demo: flag independiente del rol, no un valor nuevo de enum.
--    Una cuenta puede tener rol 'admin' (ve todo) pero solo_lectura=true
--    le bloquea cualquier escritura, tanto en RLS como en la UI/API.
-- ---------------------------------------------------------------------
alter table admin_perfiles add column solo_lectura boolean not null default false;

-- ---------------------------------------------------------------------
-- 2. Funciones de permiso. es_admin_activo() se queda igual (cualquier
--    admin activo, incluida la cuenta demo) — se sigue usando para LEER.
--    Las nuevas son para ESCRIBIR, con las dos reglas nuevas: rol
--    (editor no toca catálogo) y solo_lectura (nadie en modo demo escribe
--    nada, sea cual sea su rol).
-- ---------------------------------------------------------------------
create function puede_escribir_catalogo() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from admin_perfiles
    where user_id = auth.uid() and activo = true and not solo_lectura
      and rol in ('admin', 'superadmin')
  );
$$;

create function puede_escribir_operativo() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from admin_perfiles
    where user_id = auth.uid() and activo = true and not solo_lectura
  );
$$;

-- superadmin en modo demo tampoco gestiona perfiles de otros admins.
create or replace function es_superadmin_activo() returns boolean
language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from admin_perfiles
    where user_id = auth.uid() and rol = 'superadmin' and activo = true and not solo_lectura
  );
$$;

-- Hallazgo del advisor de seguridad (ya existía antes de este cambio,
-- se aprovecha para cerrarlo): estas funciones no deberían ser
-- invocables directo por RPC, solo las usan las policies internamente.
-- El REVOKE a anon/authenticated no alcanza — por default Postgres
-- otorga EXECUTE a PUBLIC al crear una función, y PUBLIC aplica a todos
-- los roles sin importar el revoke puntual. Hay que revocarlo de PUBLIC.
alter function es_admin_activo() set search_path = public;
revoke execute on function es_admin_activo() from public;
revoke execute on function es_superadmin_activo() from public;
revoke execute on function puede_escribir_catalogo() from public;
revoke execute on function puede_escribir_operativo() from public;

-- ---------------------------------------------------------------------
-- 3. Re-hacer las policies de escritura del catálogo: antes "for all"
--    con una sola condición (es_admin_activo, cualquier rol podía todo).
--    Ahora se separa lectura (cualquier admin activo, incl. demo — hace
--    falta para previsualizar cargas pendientes antes de publicar) de
--    escritura (puede_escribir_catalogo: no editor, no demo).
-- ---------------------------------------------------------------------
drop policy "admin_escribe_cargas" on cargas;
create policy "admin_lee_cargas" on cargas for select using (es_admin_activo());
create policy "admin_escribe_cargas" on cargas for insert with check (puede_escribir_catalogo());
create policy "admin_actualiza_cargas" on cargas for update using (puede_escribir_catalogo()) with check (puede_escribir_catalogo());
create policy "admin_elimina_cargas" on cargas for delete using (puede_escribir_catalogo());

drop policy "admin_escribe_puntero" on catalogo_activo;
create policy "admin_escribe_puntero" on catalogo_activo for update using (puede_escribir_catalogo()) with check (puede_escribir_catalogo());

drop policy "admin_escribe_productos" on productos;
create policy "admin_lee_productos" on productos for select using (es_admin_activo());
create policy "admin_escribe_productos" on productos for insert with check (puede_escribir_catalogo());
create policy "admin_actualiza_productos" on productos for update using (puede_escribir_catalogo()) with check (puede_escribir_catalogo());
create policy "admin_elimina_productos" on productos for delete using (puede_escribir_catalogo());

drop policy "admin_escribe_variantes" on variantes_color;
create policy "admin_lee_variantes" on variantes_color for select using (es_admin_activo());
create policy "admin_escribe_variantes" on variantes_color for insert with check (puede_escribir_catalogo());
create policy "admin_actualiza_variantes" on variantes_color for update using (puede_escribir_catalogo()) with check (puede_escribir_catalogo());
create policy "admin_elimina_variantes" on variantes_color for delete using (puede_escribir_catalogo());

drop policy "admin_escribe_curvas" on curvas;
create policy "admin_lee_curvas" on curvas for select using (es_admin_activo());
create policy "admin_escribe_curvas" on curvas for insert with check (puede_escribir_catalogo());
create policy "admin_actualiza_curvas" on curvas for update using (puede_escribir_catalogo()) with check (puede_escribir_catalogo());
create policy "admin_elimina_curvas" on curvas for delete using (puede_escribir_catalogo());

drop policy "admin_escribe_tallas" on tallas;
create policy "admin_lee_tallas" on tallas for select using (es_admin_activo());
create policy "admin_escribe_tallas" on tallas for insert with check (puede_escribir_catalogo());
create policy "admin_actualiza_tallas" on tallas for update using (puede_escribir_catalogo()) with check (puede_escribir_catalogo());
create policy "admin_elimina_tallas" on tallas for delete using (puede_escribir_catalogo());

-- catalogo_lock: cualquier admin activo puede ver el estado del lock;
-- solo quien puede escribir catálogo puede tomarlo/soltarlo.
drop policy "admin_gestiona_lock" on catalogo_lock;
create policy "admin_lee_lock" on catalogo_lock for select using (es_admin_activo());
create policy "admin_gestiona_lock" on catalogo_lock for update using (puede_escribir_catalogo()) with check (puede_escribir_catalogo());

-- Operativo (colecciones/guía de tallas/config): el editor SÍ puede acá,
-- el demo NO. Lectura pública ya existe (using true), no se toca.
drop policy "admin_escribe_colecciones" on colecciones;
create policy "admin_escribe_colecciones" on colecciones for insert with check (puede_escribir_operativo());
create policy "admin_actualiza_colecciones" on colecciones for update using (puede_escribir_operativo()) with check (puede_escribir_operativo());
create policy "admin_elimina_colecciones" on colecciones for delete using (puede_escribir_operativo());

drop policy "admin_escribe_guia_tallas" on guia_tallas;
create policy "admin_escribe_guia_tallas" on guia_tallas for update using (puede_escribir_operativo()) with check (puede_escribir_operativo());

drop policy "admin_escribe_config_sitio" on config_sitio;
create policy "admin_escribe_config_sitio" on config_sitio for update using (puede_escribir_operativo()) with check (puede_escribir_operativo());

-- ---------------------------------------------------------------------
-- 4. Clientes (mayoristas con cuenta propia) + Pedidos (persiste lo que
--    hoy solo se mandaba por WhatsApp — ese flujo se mantiene intacto,
--    esto se SUMA: el pedido queda guardado para que el cliente vea su
--    historial y el admin le haga seguimiento por estado).
-- ---------------------------------------------------------------------
create table clientes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  empresa text not null,
  telefono text not null,
  rif text not null,
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);

create type estado_pedido as enum ('pendiente', 'confirmado', 'despachado', 'cancelado');

create table pedidos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references clientes(user_id) on delete cascade,
  items jsonb not null, -- ItemCarrito[] (carrito.ts), snapshot al momento del pedido
  comprador jsonb not null, -- DatosComprador snapshot (el perfil pudo cambiar después)
  total numeric(10,2) not null,
  estado estado_pedido not null default 'pendiente',
  notas_admin text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  actualizado_por uuid references auth.users(id)
);
create index idx_pedidos_cliente on pedidos(cliente_id, creado_en desc);
create index idx_pedidos_estado on pedidos(estado, creado_en desc);

alter table clientes enable row level security;
alter table pedidos enable row level security;

-- Cliente ve y edita su propio perfil (no puede activarse/desactivarse solo).
create policy "propio_cliente_select" on clientes for select using (user_id = auth.uid());
create policy "propio_cliente_update" on clientes for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and activo = (select c.activo from clientes c where c.user_id = auth.uid()));

-- Admin (no demo) da de alta/gestiona clientes; cualquier admin activo (incl. demo) los lista.
create policy "admin_lee_clientes" on clientes for select using (es_admin_activo());
create policy "admin_gestiona_clientes" on clientes for insert with check (puede_escribir_operativo());
create policy "admin_actualiza_clientes" on clientes for update using (puede_escribir_operativo()) with check (puede_escribir_operativo());

-- Pedidos: el cliente ve y crea los suyos (siempre en 'pendiente' al crear).
create policy "propio_pedido_select" on pedidos for select using (cliente_id = auth.uid());
create policy "propio_pedido_insert" on pedidos for insert
  with check (cliente_id = auth.uid() and estado = 'pendiente');

-- Admin (no demo) hace seguimiento (cambia estado); cualquier admin activo (incl. demo) los lista.
create policy "admin_lee_pedidos" on pedidos for select using (es_admin_activo());
create policy "admin_actualiza_pedidos" on pedidos for update using (puede_escribir_operativo()) with check (puede_escribir_operativo());
