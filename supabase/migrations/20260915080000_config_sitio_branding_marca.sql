-- Personalización dinámica de marca: logo + visibilidad + razón social,
-- mismos campos singleton que whatsapp_ventas/descripcion_empresa/rif (ver
-- config_sitio en 20260910000000_init_schema.sql). razon_social con default
-- para no romper la fila singleton ya existente (insertada con solo id=true).
alter table config_sitio
  add column logo_url text,
  add column logo_visible boolean not null default true,
  add column razon_social text not null default 'Calzados Mesvol, C.A.';
