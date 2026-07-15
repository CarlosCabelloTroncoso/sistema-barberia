import { addDays } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { TIMEZONE, todayCivil } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Agenda, type AgendaAppointment } from "./agenda";
import { AvailabilityEditor } from "./availability-editor";
import { RealtimeNotifications } from "./realtime-notifications";

export const metadata = { title: "Panel barbero" };

export default async function BarberoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: barber } = await supabase
    .from("barbers")
    .select("id, display_name")
    .eq("profile_id", user!.id)
    .single();

  if (!barber) {
    return (
      <main className="mx-auto max-w-2xl p-8 text-center text-muted-foreground">
        Tu cuenta tiene rol de barbero pero aún no tiene perfil público.
        Pide a un administrador que lo cree.
      </main>
    );
  }

  // Agenda: desde hoy (00:00 Chile) hasta 14 días adelante.
  const rangeStart = fromZonedTime(`${todayCivil()}T00:00:00`, TIMEZONE);
  const rangeEnd = addDays(rangeStart, 14);

  const [appts, notes, availability, timeOff] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, starts_at, ends_at, status, client_id, profiles(full_name, phone), services(name, duration_minutes, price_clp)"
      )
      .eq("barber_id", barber.id)
      .gte("starts_at", rangeStart.toISOString())
      .lt("starts_at", rangeEnd.toISOString())
      .order("starts_at"),
    supabase
      .from("client_notes")
      .select("client_id, note")
      .eq("barber_id", barber.id),
    supabase
      .from("availability")
      .select("id, weekday, start_time, end_time")
      .eq("barber_id", barber.id)
      .order("weekday")
      .order("start_time"),
    supabase
      .from("time_off")
      .select("id, starts_at, ends_at, reason")
      .eq("barber_id", barber.id)
      .gte("ends_at", new Date().toISOString())
      .order("starts_at"),
  ]);

  const notesByClient: Record<string, string> = {};
  for (const n of notes.data ?? []) notesByClient[n.client_id] = n.note;

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4 py-8">
      <RealtimeNotifications barberId={barber.id} />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel barbero</h1>
        <p className="text-muted-foreground">{barber.display_name}</p>
      </div>

      <Tabs defaultValue="agenda">
        <TabsList>
          <TabsTrigger value="agenda">Agenda</TabsTrigger>
          <TabsTrigger value="disponibilidad">Disponibilidad</TabsTrigger>
        </TabsList>
        <TabsContent value="agenda" className="mt-4">
          <Agenda
            appointments={(appts.data ?? []) as unknown as AgendaAppointment[]}
            notesByClient={notesByClient}
          />
        </TabsContent>
        <TabsContent value="disponibilidad" className="mt-4">
          <AvailabilityEditor
            availability={availability.data ?? []}
            timeOff={timeOff.data ?? []}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
