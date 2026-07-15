import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../(auth)/actions";
import { AppointmentList, type AppointmentRow } from "./appointment-list";

export const metadata = { title: "Mi cuenta" };

export default async function CuentaPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/cuenta");

  const [{ data: profile }, { data: appointments }, { data: settings }, availability] =
    await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
      supabase
        .from("appointments")
        .select(
          "id, starts_at, ends_at, status, barber_id, service_id, barbers(display_name), services(name, price_clp, duration_minutes)"
        )
        .eq("client_id", user.id)
        .order("starts_at", { ascending: false }),
      supabase.from("settings").select("cancellation_window_hours").eq("id", 1).single(),
      supabase.from("availability").select("barber_id, weekday"),
    ]);

  const rows = (appointments ?? []) as unknown as AppointmentRow[];
  const now = Date.now();
  const upcoming = rows
    .filter((a) => a.status === "confirmada" && new Date(a.starts_at).getTime() > now)
    .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const history = rows.filter(
    (a) => a.status !== "confirmada" || new Date(a.starts_at).getTime() <= now
  );

  const weekdaysByBarber: Record<string, number[]> = {};
  for (const a of availability.data ?? []) {
    (weekdaysByBarber[a.barber_id] ??= []).push(a.weekday);
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-8 p-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mi cuenta</h1>
          <p className="text-muted-foreground">{profile?.full_name || user.email}</p>
        </div>
        <form action={logout}>
          <Button variant="ghost" type="submit">
            Cerrar sesión
          </Button>
        </form>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Próximas citas</h2>
          <Button size="sm" nativeButton={false} render={<Link href="/reservar" />}>
            Reservar hora
          </Button>
        </div>
        <AppointmentList
          appointments={upcoming}
          mode="upcoming"
          cancellationWindowHours={settings?.cancellation_window_hours ?? 3}
          weekdaysByBarber={weekdaysByBarber}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Historial</h2>
        <AppointmentList
          appointments={history}
          mode="history"
          cancellationWindowHours={settings?.cancellation_window_hours ?? 3}
          weekdaysByBarber={weekdaysByBarber}
        />
      </section>
    </main>
  );
}
