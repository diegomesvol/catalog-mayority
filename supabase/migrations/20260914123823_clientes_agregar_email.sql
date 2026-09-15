-- Para mostrar/identificar clientes en el panel admin sin tener que pegarle
-- a la Admin API de Auth (auth.users no es consultable por PostgREST) cada
-- vez que se lista. Se completa una sola vez, al invitar.
alter table clientes add column email text not null default '';
alter table clientes alter column email drop default;
