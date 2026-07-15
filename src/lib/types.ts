export type UserRole = "cliente" | "barbero" | "admin";

export type AppointmentStatus =
  | "confirmada"
  | "cancelada"
  | "completada"
  | "no_show";

export interface Profile {
  id: string;
  full_name: string;
  phone: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Barber {
  id: string;
  profile_id: string;
  display_name: string;
  bio: string;
  photo_url: string | null;
  is_active: boolean;
}

export interface Service {
  id: string;
  name: string;
  description: string;
  duration_minutes: number;
  price_clp: number;
  is_active: boolean;
}

export interface Availability {
  id: string;
  barber_id: string;
  weekday: number; // 0=domingo … 6=sábado
  start_time: string; // "10:00:00"
  end_time: string;
}

export interface TimeOff {
  id: string;
  barber_id: string;
  starts_at: string;
  ends_at: string;
  reason: string;
}

export interface Appointment {
  id: string;
  client_id: string;
  barber_id: string;
  service_id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  cancelled_at: string | null;
  reminder_sent_at: string | null;
  created_at: string;
}

export interface Settings {
  id: number;
  business_name: string;
  timezone: string;
  min_booking_notice_hours: number;
  cancellation_window_hours: number;
  slot_interval_minutes: number;
}
