"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

async function getMyBarberId(): Promise<
  { barberId: string } | { error: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Debes iniciar sesión" };

  const { data } = await supabase
    .from("barbers")
    .select("id")
    .eq("profile_id", user.id)
    .single();
  if (!data) return { error: "No tienes perfil de barbero" };

  return { barberId: data.id };
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function updateAppointmentStatus(
  appointmentId: string,
  status: "completada" | "no_show" | "cancelada"
): Promise<{ ok?: true; error?: string }> {
  const parsed = z
    .object({
      appointmentId: z.string().uuid(),
      status: z.enum(["completada", "no_show", "cancelada"]),
    })
    .safeParse({ appointmentId, status });
  if (!parsed.success) return { error: "Datos inválidos" };

  const me = await getMyBarberId();
  if ("error" in me) return { error: me.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId)
    .eq("barber_id", me.barberId);

  if (error) return { error: "No se pudo actualizar la cita" };
  revalidatePath("/barbero");
  return { ok: true };
}

export async function saveClientNote(
  clientId: string,
  note: string
): Promise<{ ok?: true; error?: string }> {
  const parsed = z
    .object({ clientId: z.string().uuid(), note: z.string().max(2000) })
    .safeParse({ clientId, note });
  if (!parsed.success) return { error: "Datos inválidos" };

  const me = await getMyBarberId();
  if ("error" in me) return { error: me.error };

  const supabase = await createClient();

  if (parsed.data.note.trim() === "") {
    const { error } = await supabase
      .from("client_notes")
      .delete()
      .eq("barber_id", me.barberId)
      .eq("client_id", clientId);
    if (error) return { error: "No se pudo borrar la nota" };
  } else {
    const { error } = await supabase.from("client_notes").upsert(
      {
        barber_id: me.barberId,
        client_id: clientId,
        note: parsed.data.note.trim(),
      },
      { onConflict: "barber_id,client_id" }
    );
    if (error) return { error: "No se pudo guardar la nota" };
  }

  revalidatePath("/barbero");
  return { ok: true };
}

export async function addAvailability(input: {
  weekday: number;
  startTime: string;
  endTime: string;
}): Promise<{ ok?: true; error?: string }> {
  const parsed = z
    .object({
      weekday: z.number().int().min(0).max(6),
      startTime: z.string().regex(TIME_RE),
      endTime: z.string().regex(TIME_RE),
    })
    .refine((v) => v.startTime < v.endTime, {
      message: "La hora de inicio debe ser antes que la de término",
    })
    .safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message ?? "Datos inválidos" };
  }

  const me = await getMyBarberId();
  if ("error" in me) return { error: me.error };

  const supabase = await createClient();
  const { error } = await supabase.from("availability").insert({
    barber_id: me.barberId,
    weekday: parsed.data.weekday,
    start_time: parsed.data.startTime,
    end_time: parsed.data.endTime,
  });

  if (error) return { error: "No se pudo agregar el horario" };
  revalidatePath("/barbero");
  return { ok: true };
}

export async function removeAvailability(
  id: string
): Promise<{ ok?: true; error?: string }> {
  if (!z.string().uuid().safeParse(id).success) return { error: "Datos inválidos" };

  const me = await getMyBarberId();
  if ("error" in me) return { error: me.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("availability")
    .delete()
    .eq("id", id)
    .eq("barber_id", me.barberId);

  if (error) return { error: "No se pudo eliminar el horario" };
  revalidatePath("/barbero");
  return { ok: true };
}

export async function addTimeOff(input: {
  startsAt: string;
  endsAt: string;
  reason: string;
}): Promise<{ ok?: true; error?: string }> {
  const parsed = z
    .object({
      startsAt: z.string().datetime(),
      endsAt: z.string().datetime(),
      reason: z.string().max(200),
    })
    .refine((v) => v.startsAt < v.endsAt, {
      message: "El inicio debe ser antes que el término",
    })
    .safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message ?? "Datos inválidos" };
  }

  const me = await getMyBarberId();
  if ("error" in me) return { error: me.error };

  const supabase = await createClient();
  const { error } = await supabase.from("time_off").insert({
    barber_id: me.barberId,
    starts_at: parsed.data.startsAt,
    ends_at: parsed.data.endsAt,
    reason: parsed.data.reason,
  });

  if (error) return { error: "No se pudo agregar el bloqueo" };
  revalidatePath("/barbero");
  return { ok: true };
}

export async function removeTimeOff(
  id: string
): Promise<{ ok?: true; error?: string }> {
  if (!z.string().uuid().safeParse(id).success) return { error: "Datos inválidos" };

  const me = await getMyBarberId();
  if ("error" in me) return { error: me.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("time_off")
    .delete()
    .eq("id", id)
    .eq("barber_id", me.barberId);

  if (error) return { error: "No se pudo eliminar el bloqueo" };
  revalidatePath("/barbero");
  return { ok: true };
}
