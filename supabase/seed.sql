-- Datos iniciales. Ejecutar una vez tras las migraciones.
-- Los barberos NO se siembran aquí: requieren un usuario real de auth.
-- Flujo: la persona se registra en la app → un admin la promueve (ver abajo).

insert into public.settings (id, business_name)
values (1, 'Barber Rusiosky')
on conflict (id) do nothing;

insert into public.services (name, description, duration_minutes, price_clp) values
  ('Corte de pelo',    'Corte clásico o moderno, incluye lavado.',        30, 15000),
  ('Corte + barba',    'Corte de pelo más perfilado y arreglo de barba.', 45, 22000),
  ('Arreglo de barba', 'Perfilado, afeitado y cuidado de barba.',         20, 10000),
  ('Corte niño',       'Corte para menores de 12 años.',                  30, 12000);

-- ── Promover usuarios (ejecutar manualmente con el email real) ─────────
--
-- 1. Hacer admin:
--    update public.profiles set role = 'admin'
--    where id = (select id from auth.users where email = 'dueno@ejemplo.cl');
--
-- 2. Hacer barbero (crea también su perfil público):
--    with p as (
--      update public.profiles set role = 'barbero'
--      where id = (select id from auth.users where email = 'barbero@ejemplo.cl')
--      returning id, full_name
--    )
--    insert into public.barbers (profile_id, display_name)
--    select id, coalesce(nullif(full_name, ''), 'Barbero') from p;
--
-- 3. Asignarle servicios y horario (lunes a viernes 10:00–19:00):
--    insert into public.barber_services (barber_id, service_id)
--    select b.id, s.id from public.barbers b cross join public.services s
--    where b.profile_id = (select id from auth.users where email = 'barbero@ejemplo.cl');
--
--    insert into public.availability (barber_id, weekday, start_time, end_time)
--    select b.id, d, time '10:00', time '19:00'
--    from public.barbers b, generate_series(1, 5) d
--    where b.profile_id = (select id from auth.users where email = 'barbero@ejemplo.cl');
