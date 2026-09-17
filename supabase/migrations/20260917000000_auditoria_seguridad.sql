-- =====================================================================
-- Auditoría de seguridad full-stack (2026-09-17). Dos correcciones de RLS,
-- idempotente (create or replace / drop ... if exists en todo) para poder
-- re-correr sin errores si Supabase SQL Editor ya aplicó parte de esto.
--
-- Aplicar desde Supabase Dashboard -> SQL Editor, igual que el resto de las
-- migraciones de esta carpeta.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. umbrales_stock_producto: la policy "admin_escribe_umbrales_stock" usaba
--    es_admin_activo() (true para CUALQUIER admin activo, incluida la
--    cuenta demo/solo_lectura) en vez de puede_escribir_catalogo() (excluye
--    solo_lectura, requiere rol admin/superadmin) — mismo error que
--    corrigió 20260916000000_hardening_seguridad.sql para config_sitio/
--    guia_tallas/logos_footer, pero esta tabla se creó DESPUÉS de esa
--    migración y quedó con el criterio viejo. La ruta de la app
--    (api/admin/inventario/umbrales/route.ts) ya exige "catalogo" — RLS
--    debe exigir lo mismo, si no un demo autenticado puede pisar el umbral
--    directo por PostgREST aunque el panel se lo bloquee.
-- ---------------------------------------------------------------------
drop policy if exists "admin_escribe_umbrales_stock" on umbrales_stock_producto;
create policy "admin_escribe_umbrales_stock" on umbrales_stock_producto for all
  using (puede_escribir_catalogo()) with check (puede_escribir_catalogo());

-- ---------------------------------------------------------------------
-- 2. pedidos: "admin_actualiza_pedidos" (puede_escribir_operativo) permite
--    UPDATE pero RLS no filtra por columna — un admin/editor autenticado
--    podía, por PostgREST directo, reescribir items/total/comprador/
--    cliente_id/metodo_pago/metodo_envio/direccion_envio/creado_en de un
--    pedido ya existente (ej. inflar el total después de entregado, o
--    reasignarlo a otro cliente). La app SOLO escribe estado/notas_admin
--    en el PATCH de un pedido (ver api/admin/pedidos/[id]/route.ts y
--    .../bulk/route.ts) — mismo patrón que proteger_columnas_cliente
--    (20260916000000_hardening_seguridad.sql): un trigger valida que las
--    columnas "de negocio" no cambien fuera del rol de servicio.
-- ---------------------------------------------------------------------
create or replace function public.proteger_columnas_pedido()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' then
    return new;
  end if;

  if new.cliente_id     is distinct from old.cliente_id
  or new.items           is distinct from old.items
  or new.comprador       is distinct from old.comprador
  or new.total           is distinct from old.total
  or new.metodo_pago     is distinct from old.metodo_pago
  or new.metodo_envio    is distinct from old.metodo_envio
  or new.direccion_envio is distinct from old.direccion_envio
  or new.creado_en       is distinct from old.creado_en then
    raise exception 'No tenés permiso para modificar estos datos del pedido.' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke execute on function public.proteger_columnas_pedido() from public;

drop trigger if exists trg_proteger_columnas_pedido on pedidos;
create trigger trg_proteger_columnas_pedido
  before update on pedidos
  for each row execute function public.proteger_columnas_pedido();
