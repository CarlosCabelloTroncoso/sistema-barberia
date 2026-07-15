"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Barber, Service } from "@/lib/types";
import { promoteToBarber, setBarberServices, updateBarber } from "./actions";

export function BarbersManager({
  barbers,
  services,
  servicesByBarber,
}: {
  barbers: Barber[];
  services: Service[];
  servicesByBarber: Record<string, string[]>;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <PromoteDialog />
      </div>
      <div className="grid gap-3">
        {barbers.length === 0 && (
          <p className="rounded-xl border p-4 text-sm text-muted-foreground">
            Sin barberos aún. Promueve a un usuario registrado.
          </p>
        )}
        {barbers.map((b) => (
          <BarberCard
            key={b.id}
            barber={b}
            services={services}
            assigned={servicesByBarber[b.id] ?? []}
          />
        ))}
      </div>
    </div>
  );
}

function PromoteDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const promote = () => {
    setError(null);
    startTransition(async () => {
      const res = await promoteToBarber({ email, displayName });
      if (res.error) {
        setError(res.error);
        return;
      }
      setOpen(false);
      setEmail("");
      setDisplayName("");
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" nativeButton />}>
        <UserPlus data-icon="inline-start" /> Agregar barbero
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar barbero</DialogTitle>
          <DialogDescription>
            La persona debe estar registrada en la app. Se le cambia el rol y se
            crea su perfil público.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="pb-email">Email del usuario</Label>
            <Input
              id="pb-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="barbero@ejemplo.cl"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="pb-name">Nombre a mostrar</Label>
            <Input
              id="pb-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Ej: Rusio"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={promote} disabled={pending}>
            {pending ? "Agregando…" : "Agregar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BarberCard({
  barber: b,
  services,
  assigned,
}: {
  barber: Barber;
  services: Service[];
  assigned: string[];
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(b.display_name);
  const [bio, setBio] = useState(b.bio);
  const [selected, setSelected] = useState<Set<string>>(new Set(assigned));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const toggleService = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSaved(false);
  };

  const save = () => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res1 = await updateBarber({
        id: b.id,
        displayName,
        bio,
        isActive: b.is_active,
      });
      if (res1.error) {
        setError(res1.error);
        return;
      }
      const res2 = await setBarberServices(b.id, [...selected]);
      if (res2.error) {
        setError(res2.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  };

  const toggleActive = () => {
    setError(null);
    startTransition(async () => {
      const res = await updateBarber({
        id: b.id,
        displayName,
        bio,
        isActive: !b.is_active,
      });
      if (res.error) setError(res.error);
      else router.refresh();
    });
  };

  return (
    <Card className={b.is_active ? "" : "opacity-60"}>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between gap-4">
          <p className="font-medium">
            {b.display_name}{" "}
            {!b.is_active && <Badge variant="secondary">Inactivo</Badge>}
          </p>
          <Button variant="outline" size="sm" disabled={pending} onClick={toggleActive}>
            {b.is_active ? "Desactivar" : "Activar"}
          </Button>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="flex-1 space-y-1">
            <Label htmlFor={`bn-${b.id}`}>Nombre</Label>
            <Input
              id={`bn-${b.id}`}
              value={displayName}
              onChange={(e) => {
                setDisplayName(e.target.value);
                setSaved(false);
              }}
            />
          </div>
          <div className="flex-[2] space-y-1">
            <Label htmlFor={`bb-${b.id}`}>Bio</Label>
            <Input
              id={`bb-${b.id}`}
              value={bio}
              onChange={(e) => {
                setBio(e.target.value);
                setSaved(false);
              }}
            />
          </div>
        </div>

        <div>
          <Label>Servicios que ofrece</Label>
          <div className="mt-1 flex flex-wrap gap-2">
            {services
              .filter((s) => s.is_active)
              .map((s) => (
                <Button
                  key={s.id}
                  variant={selected.has(s.id) ? "default" : "outline"}
                  size="xs"
                  onClick={() => toggleService(s.id)}
                >
                  {s.name}
                </Button>
              ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button size="sm" onClick={save} disabled={pending}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </Button>
          {saved && <span className="text-sm text-green-600">Guardado ✓</span>}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
