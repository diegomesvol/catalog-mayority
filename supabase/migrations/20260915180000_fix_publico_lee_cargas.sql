-- La tabla "cargas" tenía SELECT restringido solo a admin (admin_lee_cargas,
-- es_admin_activo()), sin ninguna política pública — a diferencia de
-- "productos", "variantes_color", "curvas", "tallas", etc., que sí tienen su
-- "publico_lee_*". El catálogo público se arma leyendo la carga activa
-- (cargas.id = catalogo_activo.carga_id), así que para un visitante anónimo
-- esa fila era invisible bajo RLS: leerCatalogoPublico() devolvía null y se
-- mostraba "Todavía no hay catálogo publicado" aunque sí existía.
--
-- Mismo patrón que "publico_lee_productos": solo se expone la carga que
-- catalogo_activo apunta como vigente, nunca cargas viejas o en borrador.
create policy "publico_lee_cargas" on cargas
  for select
  using (id = (select carga_id from catalogo_activo));
