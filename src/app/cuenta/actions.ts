"use server";

import { addMinutes } from "date-fns";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fetchDaySlots } from "@/lib/booking";
import { createClient } from "@/lib/supabase/server";

/** Errores de los triggers de negocio llegan con el texto del RAISE. */
function friendlyDbError(message: string | undefined, fallback: string): string {
  if (message && message.includes("anticipación")) return message;
  return fallback;
}

export async function cancelAppointment(
  appointmentId: string
): Promise<{ ok?: true; error?: string }> {
  if (!z.string().uuid().safeParse(appointmentId).success) {
    return { error: "Datos inválidos" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Debes iniciar sesión" };

  const { error } = await supabase
    .from("appointments")
    .update({ status: "cancelada" })
    .eq("id", appointmentId)
    .eq("client_id", user.id)
    .eq("status", "confirmada");

  if (error) {
    return {
      error: friendlyDbError(error.message, "No se pudo cancelar. Intenta de nuevo."),
    };
  }

  revalidatePath("/cuenta");
  return { ok: true };
}

const rescheduleSchema = z.object({
  appointmentId: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startsAt: z.string().datetime(),
});

export async function rescheduleAppointment(input: {
  appointmentId: string;
  date: string;
  startsAt: string;
}): Promise<{ ok?: true; error?: string }> {
  const parsed = rescheduleSchema.safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos" };

  const { appointmentId, date, startsAt } = parsed.data;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Debes iniciar sesión" };

  const { data: appt } = await supabase
    .from("appointments")
    .select("id, barber_id, service_id, status")
    .eq("id", appointmentId)
    .eq("client_id", user.id)
    .single();

  if (!appt || appt.status !== "confirmada") {
    return { error: "La cita no existe o ya no está activa" };
  }

  // La propia cita no debe bloquear su nuevo horario.
  const result = await fetchDaySlots(appt.barber_id, appt.service_id, date, appt.id);
  if ("error" in result) return { error: result.error };

  const startMs = new Date(startsAt).getTime();
  if (!result.slots.some((s) => s.getTime() === startMs)) {
    return { error: "Esa hora ya no está disponible. Elige otra." };
  }

  const { error } = await supabase
    .from("appointments")
    .update({
      starts_at: startsAt,
      ends_at: addMinutes(new Date(startsAt), result.durationMinutes).toISOString(),
    })
    .eq("id", appointmentId);

  if (error) {
    if (error.code === "23P01") {
      return { error: "Alguien reservó esa hora justo antes. Elige otra." };
    }
    return {
      error: friendlyDbError(error.message, "No se pudo reprogramar. Intenta de nuevo."),
    };
  }

  revalidatePath("/cuenta");
  return { ok: true };
}
