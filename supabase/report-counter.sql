-- Ejecuta este archivo en Supabase > SQL Editor.
-- Solo guarda un contador por año; no almacena informes ni datos personales.
create table if not exists public.report_code_counters (
  report_year integer primary key check (report_year between 2000 and 9999),
  last_number bigint not null default 0 check (last_number >= 0)
);

alter table public.report_code_counters enable row level security;
revoke all on table public.report_code_counters from anon, authenticated;

create or replace function public.next_report_number(p_year integer)
returns bigint
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  issued_number bigint;
begin
  if p_year < 2000 or p_year > 9999 then
    raise exception 'Año inválido';
  end if;

  insert into public.report_code_counters as counters (report_year, last_number)
  values (p_year, 1)
  on conflict (report_year) do update
    set last_number = counters.last_number + 1
  returning last_number into issued_number;

  return issued_number;
end;
$$;

revoke all on function public.next_report_number(integer) from public;
grant execute on function public.next_report_number(integer) to anon, authenticated;

-- Muestra el próximo número sin reservarlo ni incrementar el contador.
-- La asignación definitiva sigue ocurriendo en next_report_number al descargar.
create or replace function public.peek_report_number(p_year integer)
returns bigint
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_year < 2000 or p_year > 9999 then
    raise exception 'Año inválido';
  end if;

  return coalesce((
    select last_number + 1
    from public.report_code_counters
    where report_year = p_year
  ), 1);
end;
$$;

revoke all on function public.peek_report_number(integer) from public;
grant execute on function public.peek_report_number(integer) to anon, authenticated;
