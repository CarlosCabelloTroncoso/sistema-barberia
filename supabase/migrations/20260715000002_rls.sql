-- Row Level Security: clientes ven lo suyo, barberos su agenda, admin todo.

-- ── Funciones auxiliares ───────────────────────────────────────────────

-- security definer para evitar recursión en las policies de profiles.
create or replace function public.get_my_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.get_my_role() = 'admin'
$$;

-- id de barbero del usuario actual (null si no es barbero).
create or replace function public.my_barber_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.barbers where profile_id = auth.uid()
$$;

-- ── profiles ───────────────────────────────────────────────────────────

alter table public.profiles enable row level security;

create policy "propio perfil: leer" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

create policy "propio perfil: editar" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (
    -- nadie se auto-promueve: solo admin cambia roles
    public.is_admin() or role = (select p.role from public.profiles p where p.id = profiles.id)
  );

-- Barberos pueden ver el perfil (nombre/teléfono) de clientes con cita con ellos.
create policy "barbero ve clientes con cita" on public.profiles
  for select using (
    exists (
      select 1 from public.appointments a
      where a.client_id = profiles.id
        and a.barber_id = public.my_barber_id()
    )
  );

-- ── barbers ────────────────────────────────────────────────────────────

alter table public.barbers enable row level security;

create policy "barberos activos: público" on public.barbers
  for select using (is_active or profile_id = auth.uid() or public.is_admin());

create policy "barbero edita su perfil público" on public.barbers
  for update using (profile_id = auth.uid() or public.is_admin());

create policy "admin gestiona barberos" on public.barbers
  for insert with check (public.is_admin());

create policy "admin elimina barberos" on public.barbers
  for delete using (public.is_admin());

-- ── services ───────────────────────────────────────────────────────────

alter table public.services enable row level security;

create policy "servicios activos: público" on public.services
  for select using (is_active or public.is_admin());

create policy "admin gestiona servicios" on public.services
  for all using (public.is_admin()) with check (public.is_admin());

-- ── barber_services ────────────────────────────────────────────────────

alter table public.barber_services enable row level security;

create policy "lectura pública" on public.barber_services
  for select using (true);

create policy "barbero o admin gestiona sus servicios" on public.barber_services
  for all using (
    barber_id = public.my_barber_id() or public.is_admin()
  ) with check (
    barber_id = public.my_barber_id() or public.is_admin()
  );

-- ── availability / time_off ────────────────────────────────────────────
-- Lectura pública: se necesita para calcular slots disponibles.

alter table public.availability enable row level security;

create policy "disponibilidad: lectura pública" on public.availability
  for select using (true);

create policy "barbero o admin gestiona disponibilidad" on public.availability
  for all using (
    barber_id = public.my_barber_id() or public.is_admin()
  ) with check (
    barber_id = public.my_barber_id() or public.is_admin()
  );

alter table public.time_off enable row level security;

create policy "time_off: lectura pública" on public.time_off
  for select using (true);

create policy "barbero o admin gestiona time_off" on public.time_off
  for all using (
    barber_id = public.my_barber_id() or public.is_admin()
  ) with check (
    barber_id = public.my_barber_id() or public.is_admin()
  );

-- ── appointments ───────────────────────────────────────────────────────

alter table public.appointments enable row level security;

create policy "cliente ve sus citas" on public.appointments
  for select using (client_id = auth.uid());

create policy "barbero ve su agenda" on public.appointments
  for select using (barber_id = public.my_barber_id());

create policy "admin ve todas las citas" on public.appointments
  for select using (public.is_admin());

-- Cliente reserva para sí mismo, siempre como 'confirmada'.
create policy "cliente crea cita" on public.appointments
  for insert with check (
    client_id = auth.uid() and status = 'confirmada'
  );

-- Cliente cancela/reprograma su cita; la ventana horaria se valida en la app
-- y además en el trigger de negocio (ver abajo).
create policy "cliente modifica su cita" on public.appointments
  for update using (client_id = auth.uid());

create policy "barbero modifica su agenda" on public.appointments
  for update using (barber_id = public.my_barber_id());

create policy "admin modifica citas" on public.appointments
  for update using (public.is_admin());

-- ── client_notes ───────────────────────────────────────────────────────

alter table public.client_notes enable row level security;

create policy "barbero gestiona sus notas" on public.client_notes
  for all using (
    barber_id = public.my_barber_id() or public.is_admin()
  ) with check (
    barber_id = public.my_barber_id() or public.is_admin()
  );

-- ── settings ───────────────────────────────────────────────────────────

alter table public.settings enable row level security;

create policy "settings: lectura pública" on public.settings
  for select using (true);

create policy "admin edita settings" on public.settings
  for update using (public.is_admin());

create policy "admin crea settings" on public.settings
  for insert with check (public.is_admin());

-- ── Reglas de negocio en BD (defensa en profundidad) ───────────────────

-- Ventana de cancelación/reserva: clientes no pueden reservar con menos
-- aviso que min_booking_notice_hours ni cancelar dentro de
-- cancellation_window_hours. Barberos y admin no tienen restricción.
create or replace function public.enforce_appointment_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg public.settings%rowtype;
begin
  select * into cfg from public.settings where id = 1;

  -- Solo restringir a clientes (barbero/admin gestionan libremente).
  if public.get_my_role() = 'cliente' then
    if tg_op = 'INSERT' then
      if new.starts_at < now() + make_interval(hours => cfg.min_booking_notice_hours) then
        raise exception 'La reserva requiere al menos % horas de anticipación', cfg.min_booking_notice_hours;
      end if;
    elsif tg_op = 'UPDATE' then
      -- cancelar o reprogramar una cita que ya está muy próxima
      if old.status = 'confirmada'
         and old.starts_at < now() + make_interval(hours => cfg.cancellation_window_hours)
         and (new.status = 'cancelada' or new.starts_at <> old.starts_at) then
        raise exception 'No se puede cancelar ni reprogramar con menos de % horas de anticipación', cfg.cancellation_window_hours;
      end if;
      -- una reprogramación también respeta el aviso mínimo
      if new.starts_at <> old.starts_at
         and new.starts_at < now() + make_interval(hours => cfg.min_booking_notice_hours) then
        raise exception 'La nueva hora requiere al menos % horas de anticipación', cfg.min_booking_notice_hours;
      end if;
    end if;
  end if;

  if new.status = 'cancelada' and new.cancelled_at is null then
    new.cancelled_at = now();
  end if;

  return new;
end;
$$;

create trigger appointment_rules
  before insert or update on public.appointments
  for each row execute function public.enforce_appointment_rules();
