"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { es } from "react-day-picker/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCLP, formatDateTime, formatTime, TIMEZONE } from "@/lib/format";
import type { AppointmentStatus } from "@/lib/types";
import { getAvailableSlots } from "../reservar/actions";
import { cancelAppointment, rescheduleAppointment } from "./actions";

export interface AppointmentRow {
  id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  barber_id: string;
  service_id: string;
  barbers: { display_name: string } | null;
  services: { name: string; price_clp: number; duration_minutes: number } | null;
}

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  completada: "Completada",
  no_show: "No asistió",
};

function toCivilDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(d);
}

export function AppointmentList({
  appointments,
  mode,
  cancellationWindowHours,
  weekdaysByBarber,
}: {
  appointments: AppointmentRow[];
  mode: "upcoming" | "history";
  cancellationWindowHours: number;
  weekdaysByBarber: Record<string, number[]>;
}) {
  if (appointments.length === 0) {
    return (
      <p className="rounded-xl border p-4 text-sm text-muted-foreground">
        {mode === "upcoming" ? "No tienes citas agendadas." : "Aún no hay historial."}
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {appointments.map((a) => (
        <AppointmentCard
          key={a.id}
          appointment={a}
          mode={mode}
          cancellationWindowHours={cancellationWindowHours}
          barberWeekdays={weekdaysByBarber[a.barber_id] ?? []}
        />
      ))}
    </div>
  );
}

function AppointmentCard({
  appointment: a,
  mode,
  cancellationWindowHours,
  barberWeekdays,
}: {
  appointment: AppointmentRow;
  mode: "upcoming" | "history";
  cancellationWindowHours: number;
  barberWeekdays: number[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const withinWindow =
    new Date(a.starts_at).getTime() - Date.now() <
    cancellationWindowHours * 3600_000;

  const cancel = () => {
    setError(null);
    startTransition(async () => {
      const res = await cancelAppointment(a.id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-medium">{a.services?.name ?? "Servicio no disponible"}</p>
            <p className="text-sm text-muted-foreground">
              {a.barbers?.display_name ?? "Barbero"} · <span className="capitalize">{formatDateTime(a.starts_at)}</span>
            </p>
            {a.services && (
              <p className="text-sm text-muted-foreground">{formatCLP(a.services.price_clp)}</p>
            )}
          </div>
          <Badge variant={a.status === "confirmada" ? "default" : "secondary"}>
            {STATUS_LABEL[a.status]}
          </Badge>
        </div>

        {mode === "upcoming" && (
          <div className="flex flex-wrap items-center gap-2">
            <RescheduleDialog
              appointment={a}
              barberWeekdays={barberWeekdays}
              disabled={withinWindow || pending}
            />
            <Button
              variant="destructive"
              size="sm"
              onClick={cancel}
              disabled={withinWindow || pending}
            >
              {pending ? "Cancelando…" : "Cancelar"}
            </Button>
            {withinWindow && (
              <p className="text-xs text-muted-foreground">
                Ya no se puede modificar (menos de {cancellationWindowHours} h de
                anticipación).
              </p>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

function RescheduleDialog({
  appointment: a,
  barberWeekdays,
  disabled,
}: {
  appointment: AppointmentRow;
  barberWeekdays: number[];
  disabled: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState<Date | undefined>();
  const [slots, setSlots] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const loadSlots = (date: Date | undefined) => {
    setDay(date);
    setSlots(null);
    setError(null);
    if (!date) return;
    startTransition(async () => {
      const res = await getAvailableSlots(
        a.barber_id,
        a.service_id,
        toCivilDate(date),
        a.id
      );
      if (res.error) setError(res.error);
      setSlots(res.slots ?? []);
    });
  };

  const pick = (slot: string) => {
    if (!day) return;
    setError(null);
    startTransition(async () => {
      const res = await rescheduleAppointment({
        appointmentId: a.id,
        date: toCivilDate(day),
        startsAt: slot,
      });
      if (res.error) {
        setError(res.error);
        loadSlots(day);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm" disabled={disabled} nativeButton />
        }
      >
        Reprogramar
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reprogramar cita</DialogTitle>
          <DialogDescription>
            {a.services?.name ?? "Servicio no disponible"} con {a.barbers?.display_name ?? "barbero"} — actualmente{" "}
            <span className="capitalize">{formatDateTime(a.starts_at)}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Calendar
            mode="single"
            selected={day}
            onSelect={loadSlots}
            locale={es}
            disabled={[
              { before: new Date() },
              (d: Date) => !barberWeekdays.includes(d.getDay()),
            ]}
            className="mx-auto rounded-xl border"
          />
          {day && pending && slots === null && (
            <div className="grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-8" />
              ))}
            </div>
          )}
          {day && slots?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Sin horas disponibles ese día. Prueba otro.
            </p>
          )}
          {day && slots && slots.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {slots.map((s) => (
                <Button
                  key={s}
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => pick(s)}
                >
                  {formatTime(s)}
                </Button>
              ))}
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
