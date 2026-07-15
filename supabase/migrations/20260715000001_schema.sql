-- Esquema base: sistema de reservas para barbería
-- Timestamps siempre en UTC (timestamptz); la UI convierte a America/Santiago.

create extension if not exists btree_gist;

-- ── Tipos ──────────────────────────────────────────────────────────────

create type public.user_role as enum ('cliente', 'barbero', 'admin');

create type public.appointment_status as enum (
  'confirmada',
  'cancelada',
  'completada',
  'no_show'
);

-- ── Tablas ─────────────────────────────────────────────────────────────

-- Perfil 1:1 con auth.users. Se crea automáticamente al registrarse (trigger).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  role public.user_role not null default 'cliente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Perfil público del barbero (lo que ven los clientes al reservar).
create table public.barbers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  display_name text not null,
  bio text not null default '',
  photo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  duration_minutes int not null check (duration_minutes > 0),
  price_clp int not null check (price_clp >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Qué servicios ofrece cada barbero.
create table public.barber_services (
  barber_id uuid not null references public.barbers (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  primary key (barber_id, service_id)
);

-- Horario semanal recurrente. weekday: 0=domingo … 6=sábado.
-- Horas en hora local de la barbería (America/Santiago).
create table public.availability (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers (id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  check (start_time < end_time)
);

-- Bloqueos puntuales: vacaciones, hora de almuerzo extendida, etc.
create table public.time_off (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers (id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text not null default '',
  check (starts_at < ends_at)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  barber_id uuid not null references public.barbers (id) on delete cascade,
  service_id uuid not null references public.services (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'confirmada',
  cancelled_at timestamptz,
  reminder_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at < ends_at),
  -- Anti doble-reserva: dos citas confirmadas del mismo barbero no pueden solaparse.
  constraint no_double_booking exclude using gist (
    barber_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status = 'confirmada')
);

create index appointments_barber_starts_idx on public.appointments (barber_id, starts_at);
create index appointments_client_idx on public.appointments (client_id, starts_at desc);

-- Notas privadas del barbero sobre un cliente.
create table public.client_notes (
  id uuid primary key default gen_random_uuid(),
  barber_id uuid not null references public.barbers (id) on delete cascade,
  client_id uuid not null references public.profiles (id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (barber_id, client_id)
);

-- Configuración global (fila única).
create table public.settings (
  id int primary key default 1 check (id = 1),
  business_name text not null default 'Barbería',
  timezone text not null default 'America/Santiago',
  min_booking_notice_hours int not null default 2,
  cancellation_window_hours int not null default 3,
  slot_interval_minutes int not null default 15,
  updated_at timestamptz not null default now()
);

-- ── Triggers ───────────────────────────────────────────────────────────

-- Crear perfil automáticamente al registrarse un usuario.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mantener updated_at.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger touch_profiles before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger touch_barbers before update on public.barbers
  for each row execute function public.touch_updated_at();
create trigger touch_services before update on public.services
  for each row execute function public.touch_updated_at();
create trigger touch_appointments before update on public.appointments
  for each row execute function public.touch_updated_at();
create trigger touch_client_notes before update on public.client_notes
  for each row execute function public.touch_updated_at();
create trigger touch_settings before update on public.settings
  for each row execute function public.touch_updated_at();

-- ── Realtime ───────────────────────────────────────────────────────────

-- Notificaciones en vivo al barbero ante reservas/cancelaciones.
alter publication supabase_realtime add table public.appointments;
