"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCLP } from "@/lib/format";
import type { Service } from "@/lib/types";
import { toggleService, upsertService } from "./actions";

export function ServicesManager({ services }: { services: Service[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = (s: Service) => {
    setError(null);
    startTransition(async () => {
      const res = await toggleService(s.id, !s.is_active);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ServiceDialog
          trigger={
            <>
              <Plus data-icon="inline-start" /> Nuevo servicio
            </>
          }
        />
      </div>

      <div className="grid gap-3">
        {services.map((s) => (
          <Card key={s.id} className={s.is_active ? "" : "opacity-60"}>
            <CardContent className="flex items-center justify-between gap-4 py-4">
              <div>
                <p className="font-medium">
                  {s.name}{" "}
                  {!s.is_active && <Badge variant="secondary">Inactivo</Badge>}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatCLP(s.price_clp)} · {s.duration_minutes} min
                </p>
                {s.description && (
                  <p className="text-sm text-muted-foreground">{s.description}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <ServiceDialog
                  service={s}
                  trigger={
                    <>
                      <Pencil data-icon="inline-start" /> Editar
                    </>
                  }
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => toggle(s)}
                >
                  {s.is_active ? "Desactivar" : "Activar"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function ServiceDialog({
  service,
  trigger,
}: {
  service?: Service;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [duration, setDuration] = useState(String(service?.duration_minutes ?? 30));
  const [price, setPrice] = useState(String(service?.price_clp ?? 15000));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const save = () => {
    setError(null);
    startTransition(async () => {
      const res = await upsertService({
        id: service?.id,
        name,
        description,
        durationMinutes: Number(duration),
        priceClp: Number(price),
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant={service ? "ghost" : "default"} nativeButton />}>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{service ? "Editar servicio" : "Nuevo servicio"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="svc-name">Nombre</Label>
            <Input id="svc-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="svc-desc">Descripción</Label>
            <Input
              id="svc-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <Label htmlFor="svc-duration">Duración (min)</Label>
              <Input
                id="svc-duration"
                type="number"
                min={5}
                step={5}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label htmlFor="svc-price">Precio (CLP)</Label>
              <Input
                id="svc-price"
                type="number"
                min={0}
                step={500}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? "Guardando…" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
