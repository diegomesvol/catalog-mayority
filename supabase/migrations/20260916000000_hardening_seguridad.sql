-- =====================================================================
-- Hardening de seguridad (auditoría 2026-09-16).
--
-- ORDEN DE APLICACIÓN: primero desplegar el código que acompaña esta
-- migración (api/cliente/pedidos inserta con rol de servicio y recalcula
-- precios). Recién después correr este archivo en el SQL Editor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Cuenta demo (solo_lectura) podía escribir config_sitio, guia_tallas y
--    logos_footer DIRECTO por PostgREST: sus policies "for all" usaban
--    es_admin_activo(), que es true también para demo. Con el anon key
--    público + el JWT de la cookie, un demo podía, por ejemplo, cambiar el
--    WhatsApp de ventas y desviar todos los pedidos.
--
--    Se separa por comando (insert/update/delete) en vez de "for all": así
--    un SELECT anónimo no evalúa puede_escribir_operativo() (anon no tiene
--    EXECUTE sobre ella — mismo problema que resolvió 20260915150000).
--    insert + update separados siguen cubriendo el upsert.
-- ---------------------------------------------------------------------
drop policy if exists "admin_escribe_config_sitio" on config_sitio;
create policy "admin_inserta_config_sitio" on config_sitio for insert with check (puede_escribir_operativo());
create policy "admin_actualiza_config_sitio" on config_sitio for update using (puede_escribir_operativo()) with check (puede_escribir_operativo());

drop policy if exists "admin_escribe_guia_tallas" on guia_tallas;
create policy "admin_inserta_guia_tallas" on guia_tallas for insert with check (puede_escribir_operativo());
create policy "admin_actualiza_guia_tallas" on guia_tallas for update using (puede_escribir_operativo()) with check (puede_escribir_operativo());

drop policy if exists "admin_escribe_logos_footer" on logos_footer;
create policy "admin_inserta_logos_footer" on logos_footer for insert with check (puede_escribir_operativo());
create policy "admin_actualiza_logos_footer" on logos_footer for update using (puede_escribir_operativo()) with check (puede_escribir_operativo());
create policy "admin_elimina_logos_footer" on logos_footer for delete using (puede_escribir_operativo());

-- ---------------------------------------------------------------------
-- 2. Pedidos: el cliente podía insertar directo por PostgREST con precio y
--    total arbitrarios (y aunque estuviera desactivado — la policy no
--    miraba clientes.activo). Ahora solo inserta el servidor (rol de
--    servicio, tras validar sesión y recalcular contra el catálogo).
-- ---------------------------------------------------------------------
drop policy if exists "propio_pedido_insert" on pedidos;

-- ---------------------------------------------------------------------
-- 3. Clientes: la policy propio_cliente_update solo protegía "activo"; el
--    cliente podía cambiarse nombre, empresa, RIF, teléfono y email (datos
--    que define el admin al invitar y que el admin usa para identificarlo)
--    y poner cualquier URL externa como logo. RLS no filtra por columna,
--    así que se valida con un trigger.
-- ---------------------------------------------------------------------
create or replace function public.proteger_columnas_cliente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() = 'service_role' or puede_escribir_operativo() then
    return new;
  end if;

  if new.user_id   is distinct from old.user_id
  or new.nombre    is distinct from old.nombre
  or new.empresa   is distinct from old.empresa
  or new.telefono  is distinct from old.telefono
  or new.rif       is distinct from old.rif
  or new.email     is distinct from old.email
  or new.activo    is distinct from old.activo
  or new.creado_en is distinct from old.creado_en then
    raise exception 'No tenés permiso para modificar estos datos del perfil.' using errcode = '42501';
  end if;

  if new.logo_url is distinct from old.logo_url
     and new.logo_url is not null
     and position('/storage/v1/object/public/publico/clientes-logos/' || auth.uid()::text || '/' in new.logo_url) = 0 then
    raise exception 'URL de logo no permitida.' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke execute on function public.proteger_columnas_cliente() from public;

drop trigger if exists trg_proteger_columnas_cliente on clientes;
create trigger trg_proteger_columnas_cliente
  before update on clientes
  for each row execute function public.proteger_columnas_cliente();
