"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";
import {
  addAvailability,
  addTimeOff,
  removeAvailability,
  removeTimeOff,
} from "./actions";

const WEEKDAYS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

interface AvailabilityRow {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
}

interface TimeOffRow {
  id: string;
  starts_at: string;
  ends_at: string;
  reason: string;
}

export function AvailabilityEditor({
  availability,
  timeOff,
}: {
  availability: AvailabilityRow[];
  timeOff: TimeOffRow[];
}) {
  return (
    <div className="grid gap-4">
      <WeeklySchedule availability={availability} />
      <TimeOffManager timeOff={timeOff} />
    </div>
  );
}

function WeeklySchedule({ availability }: { availability: AvailabilityRow[] }) {
  const router = useRouter();
  const [weekday, setWeekday] = useState("1");
  const [start, setStart] = useState("10:00");
  const [end, setEnd] = useState("19:00");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const add = () => {
    setError(null);
    startTransition(async () => {
      const res = await addAvailability({
        weekday: Number(weekday),
        startTime: start,
        endTime: end,
      });
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  const remove = (id: string) => {
    setError(null);
    startTransition(async () => {
      const res = await removeAvailability(id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horario semanal</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {availability.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin horario definido — los clientes no pueden reservar contigo.
          </p>
        ) : (
          <ul className="grid gap-2">
            {availability.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <span>
                  {WEEKDAYS[a.weekday]} · {a.start_time.slice(0, 5)}–
                  {a.end_time.slice(0, 5)}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Eliminar horario"
                  disabled={pending}
                  onClick={() => remove(a.id)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label>Día</Label>
            <Select value={weekday} onValueChange={(v) => v && setWeekday(v)}>
              <SelectTrigger className="w-36">
                <SelectValue>{WEEKDAYS[Number(weekday)]}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((d, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="av-start">Desde</Label>
            <Input
              id="av-start"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-28"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="av-end">Hasta</Label>
            <Input
              id="av-end"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-28"
            />
          </div>
          <Button onClick={add} disabled={pending}>
            Agregar
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

function TimeOffManager({ timeOff }: { timeOff: TimeOffRow[] }) {
  const router = useRouter();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const add = () => {
    setError(null);
    if (!start || !end) {
      setError("Completa fecha y hora de inicio y término");
      return;
    }
    startTransition(async () => {
      // datetime-local entrega hora local del navegador (Chile para el negocio)
      const res = await addTimeOff({
        startsAt: new Date(start).toISOString(),
        endsAt: new Date(end).toISOString(),
        reason,
      });
      if (res.error) setError(res.error);
      else {
        setStart("");
        setEnd("");
        setReason("");
        router.refresh();
      }
    });
  };

  const remove = (id: string) => {
    setError(null);
    startTransition(async () => {
      const res = await removeTimeOff(id);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bloqueos (vacaciones, permisos)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {timeOff.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin bloqueos próximos.</p>
        ) : (
          <ul className="grid gap-2">
            {timeOff.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
              >
                <span className="capitalize">
                  {formatDateTime(t.starts_at)} → {formatDateTime(t.ends_at)}
                  {t.reason && (
                    <span className="text-muted-foreground"> · {t.reason}</span>
                  )}
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Eliminar bloqueo"
                  disabled={pending}
                  onClick={() => remove(t.id)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="to-start">Desde</Label>
            <Input
              id="to-start"
              type="datetime-local"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to-end">Hasta</Label>
            <Input
              id="to-end"
              type="datetime-local"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to-reason">Motivo (opcional)</Label>
            <Input
              id="to-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Vacaciones"
              className="w-40"
            />
          </div>
          <Button onClick={add} disabled={pending}>
            Bloquear
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
