"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, type AuthResult } from "../actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<AuthResult | undefined, FormData>(
    login,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Contraseña</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        {/* PENDIENTE: recuperación de contraseña no implementada aún.
            Ver bloque comentado grande en ../actions.ts para el plan
            completo. Al activarlo, descomentar este link:
        <Link
          href="/recuperar"
          className="text-xs text-muted-foreground underline underline-offset-4"
        >
          ¿Olvidaste tu contraseña?
        </Link>
        */}
      </div>
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Ingresando…" : "Ingresar"}
      </Button>
    </form>
  );
}
