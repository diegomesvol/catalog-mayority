-- Las políticas RLS de admin_perfiles/clientes/pedidos (creadas en
-- 20260914000000_rbac_demo_clientes_pedidos.sql) evalúan estas funciones
-- para el rol "authenticated", pero esa migración nunca les otorgó EXECUTE
-- a ese rol. Resultado: cualquier select/update sobre esas tablas como
-- "authenticated" fallaba con "permission denied for function ..." —
-- Postgres necesita permiso para evaluar la función aunque la policy
-- relevante para la fila en cuestión sea otra (policies del mismo comando
-- se combinan con OR y se evalúan todas). Como obtenerAdminActivo()/
-- obtenerClienteActivo() (ver src/lib/auth.ts y src/lib/clienteAuth.ts)
-- solo miraban `data` y no `error` en la respuesta de Supabase, este
-- permission denied quedaba tragado en silencio y se traducía en "no tiene
-- acceso al panel de administración" para CUALQUIER admin, aunque su fila
-- en admin_perfiles fuera correcta.
grant execute on function public.es_admin_activo() to authenticated;
grant execute on function public.es_superadmin_activo() to authenticated;
grant execute on function public.puede_escribir_catalogo() to authenticated;
grant execute on function public.puede_escribir_operativo() to authenticated;
