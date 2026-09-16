-- Título dinámico de la plataforma (Propuesta: reestructuración de branding
-- en el header) — se muestra al lado del logo en el header del catálogo
-- público (reemplazando el texto fijo "Catálogo Mayorista") y en la barra
-- superior del panel admin. Nullable, igual que el resto de los campos
-- opcionales de config_sitio: vacío = se usa ese texto por defecto (ver
-- TITULO_DEFECTO en Header.tsx/AdminHeader.tsx).
alter table config_sitio add column titulo_plataforma text;
