import { createClient } from "@/lib/supabase/server";
import type { Barber, Service } from "@/lib/types";
import { BookingWizard } from "./booking-wizard";

export const metadata = { title: "Reservar hora" };

export interface BarberWithMeta extends Barber {
  serviceIds: string[];
  weekdays: number[];
}

export default async function ReservarPage() {
  const supabase = await createClient();

  const [{ data: services }, { data: barbers }, barberServices, availability, auth] =
    await Promise.all([
      supabase
        .from("services")
        .select("*")
        .eq("is_active", true)
        .order("price_clp"),
      supabase.from("barbers").select("*").eq("is_active", true),
      supabase.from("barber_services").select("barber_id, service_id"),
      supabase.from("availability").select("barber_id, weekday"),
      supabase.auth.getUser(),
    ]);

  const barbersWithMeta: BarberWithMeta[] = (barbers ?? []).map((b: Barber) => ({
    ...b,
    serviceIds: (barberServices.data ?? [])
      .filter((bs) => bs.barber_id === b.id)
      .map((bs) => bs.service_id),
    weekdays: [
      ...new Set(
        (availability.data ?? [])
          .filter((a) => a.barber_id === b.id)
          .map((a) => a.weekday as number)
      ),
    ],
  }));

  return (
    <main className="mx-auto w-full max-w-2xl p-4 py-8">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Reservar hora</h1>
      <BookingWizard
        services={(services ?? []) as Service[]}
        barbers={barbersWithMeta}
        isLoggedIn={!!auth.data.user}
      />
    </main>
  );
}
