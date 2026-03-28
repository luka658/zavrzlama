-- Zavrzlama: služba/admin vidi sve prijave uključujući arhivirane (nadzorna lista)
-- Postojeća politika i dalje omogućuje javno čitanje ne-arhiviranih.

create policy "reports_select_all_if_service_admin"
  on public.reports for select
  to authenticated
  using (public.is_service_or_admin ());
