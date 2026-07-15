"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";
import type { Appointment } from "@/lib/types";

/**
 * Suscripción Realtime a las citas del barbero: nuevas reservas,
 * cancelaciones y reprogramaciones disparan un toast y refrescan la agenda.
 */
export function RealtimeNotifications({ barberId }: { barberId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`barber-appointments-${barberId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "appointments",
          filter: `barber_id=eq.${barberId}`,
        },
        (payload) => {
          const appt = payload.new as Appointment;
          toast.success("Nueva reserva", {
            description: formatDateTime(appt.starts_at),
          });
          router.refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "appointments",
          filter: `barber_id=eq.${barberId}`,
        },
        (payload) => {
          const before = payload.old as Partial<Appointment>;
          const after = payload.new as Appointment;

          if (after.status === "cancelada" && before.status !== "cancelada") {
            toast.warning("Cita cancelada", {
              description: formatDateTime(after.starts_at),
            });
          } else if (before.starts_at && before.starts_at !== after.starts_at) {
            toast.info("Cita reprogramada", {
              description: `Nueva hora: ${formatDateTime(after.starts_at)}`,
            });
          } else {
            return; // cambios propios (completada, no_show) no notifican
          }
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barberId, router]);

  return null;
}
