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
-- ORDEN DE APLICACIÓN: correr este archivo ANTES de desplegar el código
-- que lo acompaña (usa columnas y valores de estado nuevos). Al revés
-- que 20260916000000_hardening_seguridad.sql, acá no hay ventana
-- insegura: el código viejo sigue funcionando igual mientras tanto
-- (columnas nuevas en null, valores de estado viejos todavía válidos
-- hasta que se corre el UPDATE de abajo).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. pedidos.estado: de enum (estado_pedido) a text + check constraint.
--    Se evita "alter type ... add value" a propósito: Postgres no deja
--    usar un valor nuevo de enum en la MISMA transacción en que se
--    agregó, y el SQL Editor de Supabase corre todo el script pegado
--    como una sola transacción — con "add value" el UPDATE de abajo
--    fallaría. text + check no tiene ese problema, es igual de válido
--    para Zod/PostgREST, y es más fácil de extender a futuro.
-- ---------------------------------------------------------------------
alter table pedidos alter column estado drop default;
alter table pedidos alter column estado type text using estado::text;
alter table pedidos alter column estado set default 'pendiente';

-- Renombra los valores existentes al nuevo vocabulario (pendiente y
-- cancelado no cambian de nombre).
update pedidos set estado = 'en_proceso' where estado = 'confirmado';
update pedidos set estado = 'enviado' where estado = 'despachado';

alter table pedidos add constraint pedidos_estado_check
  check (estado in ('pendiente', 'en_proceso', 'enviado', 'entregado', 'cancelado'));

-- El enum viejo ya no lo usa ninguna columna — se borra para no dejar un
-- tipo huérfano en el schema.
drop type estado_pedido;

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
alter table pedidos add column metodo_pago text;
alter table pedidos add column metodo_envio text;
alter table pedidos add column direccion_envio text;

-- Sin cambios de RLS: el insert de pedidos ya lo hace solo el rol de
-- servicio (ver 20260916000000_hardening_seguridad.sql, que eliminó
-- propio_pedido_insert), así que estas columnas nuevas quedan cubiertas
-- por esa misma vía. admin_actualiza_pedidos (puede_escribir_operativo)
-- ya permite actualizar cualquier columna, así que el cambio de estado
-- en lote (bulk) tampoco necesita una policy nueva.
