import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Barber, Service, Settings } from "@/lib/types";
import { BarbersManager } from "./barbers-manager";
import { ServicesManager } from "./services-manager";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Administración" };

export default async function AdminPage() {
  const supabase = await createClient();

  const [services, barbers, barberServices, settings] = await Promise.all([
    supabase.from("services").select("*").order("price_clp"),
    supabase.from("barbers").select("*").order("display_name"),
    supabase.from("barber_services").select("barber_id, service_id"),
    supabase.from("settings").select("*").eq("id", 1).single(),
  ]);

  const servicesByBarber: Record<string, string[]> = {};
  for (const bs of barberServices.data ?? []) {
    (servicesByBarber[bs.barber_id] ??= []).push(bs.service_id);
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 p-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Administración</h1>

      <Tabs defaultValue="servicios">
        <TabsList>
          <TabsTrigger value="servicios">Servicios</TabsTrigger>
          <TabsTrigger value="barberos">Barberos</TabsTrigger>
          <TabsTrigger value="config">Configuración</TabsTrigger>
        </TabsList>
        <TabsContent value="servicios" className="mt-4">
          <ServicesManager services={(services.data ?? []) as Service[]} />
        </TabsContent>
        <TabsContent value="barberos" className="mt-4">
          <BarbersManager
            barbers={(barbers.data ?? []) as Barber[]}
            services={(services.data ?? []) as Service[]}
            servicesByBarber={servicesByBarber}
          />
        </TabsContent>
        <TabsContent value="config" className="mt-4">
          <SettingsForm settings={settings.data as Settings} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
