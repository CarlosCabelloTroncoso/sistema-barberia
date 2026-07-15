"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { es } from "react-day-picker/locale";
import { CheckCircle2, ChevronLeft } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCLP, formatDate, formatDateTime, formatTime, TIMEZONE } from "@/lib/format";
import type { Service } from "@/lib/types";
import type { BarberWithMeta } from "./page";
import { bookAppointment, getAvailableSlots } from "./actions";

type Step = "servicio" | "barbero" | "horario" | "confirmar" | "listo";

/** Día civil de hoy en Chile, "YYYY-MM-DD" */
function toCivilDate(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(d);
}

export function BookingWizard({
  services,
  barbers,
  isLoggedIn,
}: {
  services: Service[];
  barbers: BarberWithMeta[];
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("servicio");
  const [service, setService] = useState<Service | null>(null);
  const [barber, setBarber] = useState<BarberWithMeta | null>(null);
  const [day, setDay] = useState<Date | undefined>();
  const [slots, setSlots] = useState<string[] | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const availableBarbers = useMemo(
    () => (service ? barbers.filter((b) => b.serviceIds.includes(service.id)) : barbers),
    [barbers, service]
  );

  const loadSlots = useCallback(
    (date: Date) => {
      if (!barber || !service) return;
      setSlots(null);
      setSlot(null);
      setError(null);
      startTransition(async () => {
        const res = await getAvailableSlots(barber.id, service.id, toCivilDate(date));
        if (res.error) setError(res.error);
        setSlots(res.slots ?? []);
      });
    },
    [barber, service]
  );

  useEffect(() => {
    if (day) loadSlots(day);
  }, [day, loadSlots]);

  const confirm = () => {
    if (!barber || !service || !day || !slot) return;
    setError(null);
    startTransition(async () => {
      const res = await bookAppointment({
        barberId: barber.id,
        serviceId: service.id,
        date: toCivilDate(day),
        startsAt: slot,
      });
      if (res.error) {
        setError(res.error);
        if (res.error.includes("ya no está") || res.error.includes("justo antes")) {
          if (day) loadSlots(day);
          setStep("horario");
        }
        return;
      }
      setStep("listo");
      router.refresh();
    });
  };

  const back = () => {
    setError(null);
    if (step === "barbero") setStep("servicio");
    else if (step === "horario") setStep("barbero");
    else if (step === "confirmar") setStep("horario");
  };

  if (step === "listo" && service && barber && slot) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
          <CheckCircle2 className="size-12 text-green-600" />
          <div>
            <p className="text-lg font-semibold">¡Reserva confirmada!</p>
            <p className="text-muted-foreground">
              {service.name} con {barber.display_name}
            </p>
            <p className="text-muted-foreground capitalize">{formatDateTime(slot)}</p>
          </div>
          <div className="flex gap-3">
            <Button nativeButton={false} render={<Link href="/cuenta" />}>Ver mis reservas</Button>
            <Button
              variant="outline"
              onClick={() => {
                setStep("servicio");
                setService(null);
                setBarber(null);
                setDay(undefined);
                setSlots(null);
                setSlot(null);
              }}
            >
              Nueva reserva
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {step !== "servicio" && (
        <Button variant="ghost" size="sm" onClick={back}>
          <ChevronLeft data-icon="inline-start" /> Volver
        </Button>
      )}

      {step === "servicio" && (
        <div className="grid gap-3">
          <p className="text-muted-foreground">1 de 4 · Elige el servicio</p>
          {services.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setService(s);
                setStep("barbero");
              }}
              className="rounded-xl border p-4 text-left transition-colors hover:bg-muted"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{s.name}</p>
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-semibold">{formatCLP(s.price_clp)}</p>
                  <p className="text-sm text-muted-foreground">{s.duration_minutes} min</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {step === "barbero" && (
        <div className="grid gap-3">
          <p className="text-muted-foreground">2 de 4 · Elige tu barbero</p>
          {availableBarbers.length === 0 && (
            <p className="rounded-xl border p-4 text-muted-foreground">
              Ningún barbero ofrece este servicio por ahora.
            </p>
          )}
          {availableBarbers.map((b) => (
            <button
              key={b.id}
              onClick={() => {
                setBarber(b);
                setDay(undefined);
                setSlots(null);
                setStep("horario");
              }}
              className="flex items-center gap-4 rounded-xl border p-4 text-left transition-colors hover:bg-muted"
            >
              <Avatar className="size-12">
                {b.photo_url && <AvatarImage src={b.photo_url} alt="" />}
                <AvatarFallback>{b.display_name.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{b.display_name}</p>
                {b.bio && <p className="text-sm text-muted-foreground">{b.bio}</p>}
              </div>
            </button>
          ))}
        </div>
      )}

      {step === "horario" && barber && (
        <div className="space-y-4">
          <p className="text-muted-foreground">3 de 4 · Elige fecha y hora</p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Calendar
              mode="single"
              selected={day}
              onSelect={setDay}
              locale={es}
              disabled={[
                { before: new Date() },
                (d: Date) => !barber.weekdays.includes(d.getDay()),
              ]}
              className="mx-auto rounded-xl border sm:mx-0"
            />
            <div className="min-h-32 flex-1">
              {!day && (
                <p className="text-sm text-muted-foreground">
                  Selecciona un día para ver las horas disponibles.
                </p>
              )}
              {day && pending && slots === null && (
                <div className="grid grid-cols-3 gap-2">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <Skeleton key={i} className="h-8" />
                  ))}
                </div>
              )}
              {day && slots?.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Sin horas disponibles el {formatDate(day)}. Prueba otro día.
                </p>
              )}
              {day && slots && slots.length > 0 && (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {slots.map((s) => (
                    <Button
                      key={s}
                      variant={slot === s ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSlot(s);
                        setStep("confirmar");
                      }}
                    >
                      {formatTime(s)}
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {step === "confirmar" && service && barber && slot && (
        <div className="space-y-4">
          <p className="text-muted-foreground">4 de 4 · Confirma tu reserva</p>
          <Card>
            <CardContent className="space-y-2 py-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Servicio</span>
                <span className="font-medium">{service.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Barbero</span>
                <span className="font-medium">{barber.display_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fecha</span>
                <span className="font-medium capitalize">{formatDateTime(slot)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duración</span>
                <span className="font-medium">{service.duration_minutes} min</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-muted-foreground">Total (se paga en el local)</span>
                <span className="font-semibold">{formatCLP(service.price_clp)}</span>
              </div>
            </CardContent>
          </Card>
          {isLoggedIn ? (
            <Button className="w-full" size="lg" onClick={confirm} disabled={pending}>
              {pending ? "Reservando…" : "Confirmar reserva"}
            </Button>
          ) : (
            <Button
              className="w-full"
              size="lg"
              nativeButton={false} render={<Link href="/login?next=/reservar" />}
            >
              Inicia sesión para confirmar
            </Button>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
