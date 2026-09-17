-- =====================================================================
-- Pedidos: 5 estados de seguimiento (antes 4) + captura de método de
-- pago/envío y dirección de despacho al momento del pedido.
--
-- Pedido de Diego (Módulo de Gestión de Pedidos, panel admin). Correr a
-- mano en el SQL Editor de Supabase — mismo criterio que el resto de las
-- migraciones de este proyecto (ver la nota en
-- 20260910000000_init_schema.sql sobre aplicar desde SQL Editor/MCP en
-- vez de `supabase db push`).
--
-- IDEMPOTENTE a propósito: el SQL Editor de Supabase corre cada
-- sentencia con autocommit propio (no como una sola transacción), así
-- que si una corrida se corta a mitad, la siguiente puede chocar con lo
-- que ya quedó aplicado ("constraint ya existe", etc.). Este archivo se
-- puede correr las veces que hagan falta sin error, sea cual sea el
-- estado en el que haya quedado.
--
-- ORDEN DE APLICACIÓN: correr este archivo ANTES de desplegar el código
-- que lo acompaña (usa columnas y valores de estado nuevos).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. pedidos.estado: de enum (estado_pedido) a text + check constraint.
--    Se evita "alter type ... add value" a propósito: Postgres no deja
--    usar un valor nuevo de enum en la MISMA transacción en que se
--    agregó, y eso rompía el UPDATE de renombrado más abajo. text +
--    check no tiene ese problema, es igual de válido para Zod/PostgREST,
--    y es más fácil de extender a futuro.
-- ---------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_name = 'pedidos' and column_name = 'estado' and data_type <> 'text'
  ) then
    alter table pedidos alter column estado drop default;
    alter table pedidos alter column estado type text using estado::text;
    alter table pedidos alter column estado set default 'pendiente';
  end if;
end $$;

-- Renombra los valores existentes al nuevo vocabulario (pendiente y
-- cancelado no cambian de nombre) — no hace nada si ya se corrió antes.
update pedidos set estado = 'en_proceso' where estado = 'confirmado';
update pedidos set estado = 'enviado' where estado = 'despachado';

alter table pedidos drop constraint if exists pedidos_estado_check;
alter table pedidos add constraint pedidos_estado_check
  check (estado in ('pendiente', 'en_proceso', 'enviado', 'entregado', 'cancelado'));

-- El enum viejo ya no lo usa ninguna columna — se borra para no dejar un
-- tipo huérfano en el schema. "if exists": no falla si ya se borró.
drop type if exists estado_pedido;

-- ---------------------------------------------------------------------
-- 2. Captura de método de pago, método de envío y dirección de
--    despacho AL MOMENTO DEL PEDIDO. Antes esto solo existía a nivel de
--    perfil del cliente (clientes.metodos_pago/direccion/ciudad/
--    estado_ubicacion) — un pedido puntual podía pagarse o despacharse
--    distinto a como está configurado el perfil. Quedan en null en los
--    pedidos que ya existen (dato que no se pedía cuando se hicieron);
--    el front y el PDF muestran "No especificado" en ese caso y caen al
--    dato del perfil del cliente cuando corresponde.
-- ---------------------------------------------------------------------
alter table pedidos add column if not exists metodo_pago text;
alter table pedidos add column if not exists metodo_envio text;
alter table pedidos add column if not exists direccion_envio text;

-- Sin cambios de RLS: el insert de pedidos ya lo hace solo el rol de
-- servicio (ver 20260916000000_hardening_seguridad.sql, que eliminó
-- propio_pedido_insert), así que estas columnas nuevas quedan cubiertas
-- por esa misma vía. admin_actualiza_pedidos (puede_escribir_operativo)
-- ya permite actualizar cualquier columna, así que el cambio de estado
-- en lote (bulk) tampoco necesita una policy nueva.
