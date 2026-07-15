import "server-only";

import { addMinutes } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { TIMEZONE } from "./format";
import { computeSlots, weekdayOf } from "./slots";
import { createClient } from "./supabase/server";

/**
 * Slots disponibles (UTC) para un barbero/servicio en un día civil chileno.
 * `excludeAppointmentId`: al reprogramar, la propia cita no debe bloquear.
 */
export async function fetchDaySlots(
  barberId: string,
  serviceId: string,
  date: string,
  excludeAppointmentId?: string
): Promise<{ slots: Date[]; durationMinutes: number } | { error: string }> {
  const supabase = await createClient();

  const dayStart = fromZonedTime(`${date}T00:00:00`, TIMEZONE);
  const dayEnd = addMinutes(dayStart, 24 * 60 + 120); // margen por cambios DST

  let apptsQuery = supabase
    .from("appointments")
    .select("id, starts_at, ends_at")
    .eq("barber_id", barberId)
    .eq("status", "confirmada")
    .lt("starts_at", dayEnd.toISOString())
    .gt("ends_at", dayStart.toISOString());
  if (excludeAppointmentId) {
    apptsQuery = apptsQuery.neq("id", excludeAppointmentId);
  }

  const [serviceRes, availabilityRes, settingsRes, apptsRes, timeOffRes] =
    await Promise.all([
      supabase
        .from("services")
        .select("duration_minutes")
        .eq("id", serviceId)
        .single(),
      supabase
        .from("availability")
        .select("start_time, end_time")
        .eq("barber_id", barberId)
        .eq("weekday", weekdayOf(date)),
      supabase.from("settings").select("*").eq("id", 1).single(),
      apptsQuery,
      supabase
        .from("time_off")
        .select("starts_at, ends_at")
        .eq("barber_id", barberId)
        .lt("starts_at", dayEnd.toISOString())
        .gt("ends_at", dayStart.toISOString()),
    ]);

  if (serviceRes.error || settingsRes.error) {
    return { error: "No se pudo cargar la información. Intenta de nuevo." };
  }

  const slots = computeSlots({
    date,
    durationMinutes: serviceRes.data.duration_minutes,
    availability: availabilityRes.data ?? [],
    busy: [...(apptsRes.data ?? []), ...(timeOffRes.data ?? [])],
    slotIntervalMinutes: settingsRes.data.slot_interval_minutes,
    minBookingNoticeHours: settingsRes.data.min_booking_notice_hours,
  });

  return { slots, durationMinutes: serviceRes.data.duration_minutes };
}
