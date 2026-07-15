"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type Result = { ok?: true; error?: string };

/** Toda action de este archivo exige rol admin. */
async function requireAdmin(): Promise<{ userId: string } | { error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Debes iniciar sesión" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return { error: "Requiere rol administrador" };

  return { userId: user.id };
}

// ── Servicios ──────────────────────────────────────────────────────────

const serviceSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2, "Nombre muy corto").max(80),
  description: z.string().max(300),
  durationMinutes: z.coerce.number().int().min(5, "Duración mínima 5 min").max(480),
  priceClp: z.coerce.number().int().min(0, "Precio inválido"),
});

export async function upsertService(input: {
  id?: string;
  name: string;
  description: string;
  durationMinutes: number;
  priceClp: number;
}): Promise<Result> {
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const admin = await requireAdmin();
  if ("error" in admin) return { error: admin.error };

  const supabase = await createClient();
  const row = {
    name: parsed.data.name,
    description: parsed.data.description,
    duration_minutes: parsed.data.durationMinutes,
    price_clp: parsed.data.priceClp,
  };

  const { error } = parsed.data.id
    ? await supabase.from("services").update(row).eq("id", parsed.data.id)
    : await supabase.from("services").insert(row);

  if (error) return { error: "No se pudo guardar el servicio" };
  revalidatePath("/admin");
  return { ok: true };
}

export async function toggleService(id: string, isActive: boolean): Promise<Result> {
  if (!z.string().uuid().safeParse(id).success) return { error: "Datos inválidos" };

  const admin = await requireAdmin();
  if ("error" in admin) return { error: admin.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({ is_active: isActive })
    .eq("id", id);

  if (error) return { error: "No se pudo actualizar el servicio" };
  revalidatePath("/admin");
  return { ok: true };
}

// ── Barberos ───────────────────────────────────────────────────────────

export async function promoteToBarber(input: {
  email: string;
  displayName: string;
}): Promise<Result> {
  const parsed = z
    .object({
      email: z.string().email("Email inválido"),
      displayName: z.string().min(2, "Nombre muy corto").max(60),
    })
    .safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const admin = await requireAdmin();
  if ("error" in admin) return { error: admin.error };

  // service key: buscar el usuario por email (auth.users no es accesible con RLS)
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from("profiles")
    .select("id, role")
    .eq(
      "id",
      (
        await adminClient.auth.admin
          .listUsers({ page: 1, perPage: 1000 })
          .then((r) =>
            r.data.users.find(
              (u) => u.email?.toLowerCase() === parsed.data.email.toLowerCase()
            )
          )
      )?.id ?? "00000000-0000-0000-0000-000000000000"
    )
    .single();

  if (!profile) {
    return {
      error:
        "No existe un usuario con ese email. La persona debe registrarse primero en la app.",
    };
  }
  if (profile.role === "barbero") {
    return { error: "Ese usuario ya es barbero" };
  }

  const { error: roleError } = await adminClient
    .from("profiles")
    .update({ role: "barbero" })
    .eq("id", profile.id);
  if (roleError) return { error: "No se pudo actualizar el rol" };

  const { error: barberError } = await adminClient.from("barbers").insert({
    profile_id: profile.id,
    display_name: parsed.data.displayName,
  });
  if (barberError) return { error: "No se pudo crear el perfil de barbero" };

  revalidatePath("/admin");
  return { ok: true };
}

export async function updateBarber(input: {
  id: string;
  displayName: string;
  bio: string;
  isActive: boolean;
}): Promise<Result> {
  const parsed = z
    .object({
      id: z.string().uuid(),
      displayName: z.string().min(2).max(60),
      bio: z.string().max(300),
      isActive: z.boolean(),
    })
    .safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos" };

  const admin = await requireAdmin();
  if ("error" in admin) return { error: admin.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("barbers")
    .update({
      display_name: parsed.data.displayName,
      bio: parsed.data.bio,
      is_active: parsed.data.isActive,
    })
    .eq("id", parsed.data.id);

  if (error) return { error: "No se pudo actualizar el barbero" };
  revalidatePath("/admin");
  return { ok: true };
}

export async function setBarberServices(
  barberId: string,
  serviceIds: string[]
): Promise<Result> {
  const parsed = z
    .object({ barberId: z.string().uuid(), serviceIds: z.array(z.string().uuid()) })
    .safeParse({ barberId, serviceIds });
  if (!parsed.success) return { error: "Datos inválidos" };

  const admin = await requireAdmin();
  if ("error" in admin) return { error: admin.error };

  const supabase = await createClient();

  const { error: delError } = await supabase
    .from("barber_services")
    .delete()
    .eq("barber_id", barberId);
  if (delError) return { error: "No se pudo actualizar los servicios" };

  if (serviceIds.length > 0) {
    const { error: insError } = await supabase.from("barber_services").insert(
      serviceIds.map((service_id) => ({ barber_id: barberId, service_id }))
    );
    if (insError) return { error: "No se pudo asignar los servicios" };
  }

  revalidatePath("/admin");
  return { ok: true };
}

// ── Configuración ──────────────────────────────────────────────────────

export async function updateSettings(input: {
  businessName: string;
  minBookingNoticeHours: number;
  cancellationWindowHours: number;
  slotIntervalMinutes: number;
}): Promise<Result> {
  const parsed = z
    .object({
      businessName: z.string().min(2).max(80),
      minBookingNoticeHours: z.coerce.number().int().min(0).max(72),
      cancellationWindowHours: z.coerce.number().int().min(0).max(72),
      slotIntervalMinutes: z.coerce.number().int().min(5).max(120),
    })
    .safeParse(input);
  if (!parsed.success) return { error: "Datos inválidos" };

  const admin = await requireAdmin();
  if ("error" in admin) return { error: admin.error };

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .update({
      business_name: parsed.data.businessName,
      min_booking_notice_hours: parsed.data.minBookingNoticeHours,
      cancellation_window_hours: parsed.data.cancellationWindowHours,
      slot_interval_minutes: parsed.data.slotIntervalMinutes,
    })
    .eq("id", 1);

  if (error) return { error: "No se pudo guardar la configuración" };
  revalidatePath("/admin");
  return { ok: true };
}
