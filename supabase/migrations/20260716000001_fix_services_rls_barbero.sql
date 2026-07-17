-- Barbero y cliente necesitan ver servicios inactivos si tienen una cita
-- (pasada o futura) que los referencia; si no, el join de
-- "appointments -> services" devuelve null y rompe /barbero y /cuenta
-- en runtime (ver 1d09870, "consolida la carta": desactivó 2 servicios).
-- Antes solo is_active/admin podían leer.

drop policy "servicios activos: público" on public.services;

create policy "servicios: público activos, dueños de citas ven todos" on public.services
  for select using (
    is_active
    or public.is_admin()
    or public.my_barber_id() is not null
    or exists (
      select 1 from public.appointments a
      where a.service_id = services.id and a.client_id = auth.uid()
    )
  );
