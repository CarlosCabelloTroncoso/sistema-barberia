"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";
import { NotebookPen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { formatCLP, formatTime, TIMEZONE, toCivilDate } from "@/lib/format";
import type { AppointmentStatus } from "@/lib/types";
import { saveClientNote, updateAppointmentStatus } from "./actions";

export interface AgendaAppointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  client_id: string;
  profiles: { full_name: string; phone: string | null };
  services: { name: string; duration_minutes: number; price_clp: number };
}

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  completada: "Completada",
  no_show: "No asistió",
};

export function Agenda({
  appointments,
  notesByClient,
}: {
  appointments: AgendaAppointment[];
  notesByClient: Record<string, string>;
}) {
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(new Date(), i)),
    []
  );
  const [selected, setSelected] = useState(toCivilDate(days[0]));

  const dayAppointments = appointments.filter(
    (a) => toCivilDate(new Date(a.starts_at)) === selected
  );

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((d, i) => {
          const civil = toCivilDate(d);
          const count = appointments.filter(
            (a) =>
              a.status === "confirmada" &&
              toCivilDate(new Date(a.starts_at)) === civil
          ).length;
          return (
            <Button
              key={civil}
              variant={selected === civil ? "default" : "outline"}
              size="sm"
              className="shrink-0"
              onClick={() => setSelected(civil)}
            >
              <span className="capitalize">
                {i === 0
                  ? "Hoy"
                  : formatInTimeZone(d, TIMEZONE, "EEE d", { locale: es })}
              </span>
              {count > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      {dayAppointments.length === 0 ? (
        <p className="rounded-xl border p-4 text-sm text-muted-foreground">
          Sin citas este día.
        </p>
      ) : (
        <div className="grid gap-3">
          {dayAppointments.map((a) => (
            <AgendaCard
              key={a.id}
              appointment={a}
              note={notesByClient[a.client_id] ?? ""}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function AgendaCard({
  appointment: a,
  note,
}: {
  appointment: AgendaAppointment;
  note: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const setStatus = (status: "completada" | "no_show" | "cancelada") => {
    setError(null);
    startTransition(async () => {
      const res = await updateAppointmentStatus(a.id, status);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold tabular-nums">
              {formatTime(a.starts_at)} – {formatTime(a.ends_at)}
            </p>
            <p className="font-medium">{a.profiles.full_name || "Cliente"}</p>
            <p className="text-sm text-muted-foreground">
              {a.services.name} · {formatCLP(a.services.price_clp)}
              {a.profiles.phone && <> · {a.profiles.phone}</>}
            </p>
            {note && (
              <p className="mt-1 rounded-lg bg-muted px-2 py-1 text-sm">
                📝 {note}
              </p>
            )}
          </div>
          <Badge variant={a.status === "confirmada" ? "default" : "secondary"}>
            {STATUS_LABEL[a.status]}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-2">
          {a.status === "confirmada" && (
            <>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => setStatus("completada")}
              >
                Completada
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => setStatus("no_show")}
              >
                No asistió
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={pending}
                onClick={() => setStatus("cancelada")}
              >
                Cancelar
              </Button>
            </>
          )}
          <NoteDialog
            clientId={a.client_id}
            clientName={a.profiles.full_name || "Cliente"}
            initialNote={note}
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}

function NoteDialog({
  clientId,
  clientName,
  initialNote,
}: {
  clientId: string;
  clientName: string;
  initialNote: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initialNote);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await saveClientNote(clientId, text);
      if (res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setText(initialNote);
      }}
    >
      <DialogTrigger
        render={<Button size="sm" variant="ghost" nativeButton />}
      >
        <NotebookPen data-icon="inline-start" /> Nota
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nota sobre {clientName}</DialogTitle>
          <DialogDescription>
            Solo tú (y los administradores) pueden ver esta nota.
          </DialogDescription>
        </DialogHeader>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          maxLength={2000}
          placeholder="Ej: prefiere fade bajo, alergia a producto X…"
          className="w-full rounded-lg border bg-transparent p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cerrar
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
