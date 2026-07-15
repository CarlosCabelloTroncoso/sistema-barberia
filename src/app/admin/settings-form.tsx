"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Settings } from "@/lib/types";
import { updateSettings } from "./actions";

export function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const [businessName, setBusinessName] = useState(settings.business_name);
  const [notice, setNotice] = useState(String(settings.min_booking_notice_hours));
  const [window_, setWindow] = useState(String(settings.cancellation_window_hours));
  const [interval, setInterval] = useState(String(settings.slot_interval_minutes));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateSettings({
        businessName,
        minBookingNoticeHours: Number(notice),
        cancellationWindowHours: Number(window_),
        slotIntervalMinutes: Number(interval),
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración general</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="cfg-name">Nombre del negocio</Label>
          <Input
            id="cfg-name"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label htmlFor="cfg-notice">Aviso mínimo para reservar (horas)</Label>
            <Input
              id="cfg-notice"
              type="number"
              min={0}
              max={72}
              value={notice}
              onChange={(e) => setNotice(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cfg-window">Ventana para cancelar (horas)</Label>
            <Input
              id="cfg-window"
              type="number"
              min={0}
              max={72}
              value={window_}
              onChange={(e) => setWindow(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="cfg-interval">Intervalo de slots (minutos)</Label>
            <Input
              id="cfg-interval"
              type="number"
              min={5}
              max={120}
              step={5}
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
          {saved && <span className="text-sm text-green-600">Guardado ✓</span>}
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
