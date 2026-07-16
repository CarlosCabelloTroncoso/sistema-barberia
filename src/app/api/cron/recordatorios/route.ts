import { addHours } from "date-fns";
import { NextResponse, type NextRequest } from "next/server";
import { sendReminderEmail } from "@/lib/email";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron (1 vez al día, 13:00 UTC ≈ 10:00 Chile): envía recordatorio a
 * citas confirmadas que empiezan dentro de las próximas 24 horas y aún no
 * fueron recordadas. Plan Hobby de Vercel solo permite crons diarios.
 */
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const now = new Date();

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, client_id, profiles(full_name), services(name, price_clp), barbers(display_name)"
    )
    .eq("status", "confirmada")
    .is("reminder_sent_at", null)
    .gt("starts_at", now.toISOString())
    .lte("starts_at", addHours(now, 24).toISOString());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  for (const appt of appointments ?? []) {
    const { data: userData } = await supabase.auth.admin.getUserById(
      appt.client_id
    );
    const email = userData?.user?.email;
    if (!email) continue;

    const svc = appt.services as unknown as { name: string; price_clp: number };
    const barber = appt.barbers as unknown as { display_name: string };
    const profile = appt.profiles as unknown as { full_name: string };

    await sendReminderEmail({
      to: email,
      clientName: profile?.full_name || "cliente",
      serviceName: svc?.name ?? "Servicio",
      barberName: barber?.display_name ?? "tu barbero",
      startsAt: appt.starts_at,
      priceClp: svc?.price_clp ?? 0,
    });

    await supabase
      .from("appointments")
      .update({ reminder_sent_at: new Date().toISOString() })
      .eq("id", appt.id);
    sent++;
  }

  return NextResponse.json({ ok: true, candidatas: appointments?.length ?? 0, enviadas: sent });
}
