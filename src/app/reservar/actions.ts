"use server";

import { addMinutes } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { z } from "zod";
import { TIMEZONE } from "@/lib/format";
import { computeSlots, weekdayOf } from "@/lib/slots";
import { createClient } from "@/lib/supabase/server";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

async function fetchDaySlots(
  barberId: string,
  serviceId: string,
  date: string
): Promise<{ slots: Date[]; durationMinutes: number } | { error: string }> {
  const supabase = await createClient();

  const dayStart = fromZonedTime(`${date}T00:00:00`, TIMEZONE);
  const dayEnd = addMinutes(dayStart, 24 * 60 + 120); // margen por cambios DST

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
      supabase
        .from("appointments")
        .select("starts_at, ends_at")
        .eq("barber_id", barberId)
        .eq("status", "confirmada")
        .lt("starts_at", dayEnd.toISOString())
        .gt("ends_at", dayStart.toISOString()),
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

export async function getAvailableSlots(
  barberId: string,
  serviceId: string,
  date: string
): Promise<{ slots?: string[]; error?: string }> {
  const valid = z
    .object({
      barberId: z.string().uuid(),
      serviceId: z.string().uuid(),
      date: z.string().regex(DATE_RE),
    })
    .safeParse({ barberId, serviceId, date });
  if (!valid.success) return { error: "Datos inválidos" };

  const result = await fetchDaySlots(barberId, serviceId, date);
  if ("error" in result) return { error: result.error };

  return { slots: result.slots.map((s) => s.toISOString()) };
}

const bookSchema = z.object({
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  date: z.string().regex(DATE_RE),
  startsAt: z.string().datetime(),
});

export async function bookAppointment(input: {
  barberId: string;
  serviceId: string;
  date: string;
  startsAt: string;
}): Promise<{ ok?: true; error?: string }> {
  const parsed = bookSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos" };

  const { barberId, serviceId, date, startsAt } = parsed.data;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Debes iniciar sesión para reservar" };

  // Revalidar server-side que el slot sigue disponible y pertenece a la
  // disponibilidad real del barbero (el cliente pudo manipular el valor).
  const result = await fetchDaySlots(barberId, serviceId, date);
  if ("error" in result) return { error: result.error };

  const startMs = new Date(startsAt).getTime();
  if (!result.slots.some((s) => s.getTime() === startMs)) {
    return { error: "Esa hora ya no está disponible. Elige otra." };
  }

  const { error } = await supabase.from("appointments").insert({
    client_id: user.id,
    barber_id: barberId,
    service_id: serviceId,
    starts_at: startsAt,
    ends_at: addMinutes(new Date(startsAt), result.durationMinutes).toISOString(),
  });

  if (error) {
    // 23P01 = exclusion_violation: otro cliente tomó el slot primero
    if (error.code === "23P01") {
      return { error: "Alguien reservó esa hora justo antes. Elige otra." };
    }
    return { error: "No se pudo crear la reserva. Intenta de nuevo." };
  }

  return { ok: true };
}
