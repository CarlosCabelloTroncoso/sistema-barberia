"use server";

import { addMinutes } from "date-fns";
import { z } from "zod";
import { fetchDaySlots } from "@/lib/booking";
import { createClient } from "@/lib/supabase/server";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function getAvailableSlots(
  barberId: string,
  serviceId: string,
  date: string,
  excludeAppointmentId?: string
): Promise<{ slots?: string[]; error?: string }> {
  const valid = z
    .object({
      barberId: z.string().uuid(),
      serviceId: z.string().uuid(),
      date: z.string().regex(DATE_RE),
      excludeAppointmentId: z.string().uuid().optional(),
    })
    .safeParse({ barberId, serviceId, date, excludeAppointmentId });
  if (!valid.success) return { error: "Datos inválidos" };

  const result = await fetchDaySlots(barberId, serviceId, date, excludeAppointmentId);
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
