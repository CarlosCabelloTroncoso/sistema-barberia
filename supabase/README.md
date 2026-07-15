# Base de datos (Supabase)

## Aplicar el esquema

Opción rápida (sin CLI): en el dashboard de Supabase → **SQL Editor** → pegar y ejecutar en orden:

1. `migrations/20260715000001_schema.sql` — tablas, triggers, realtime
2. `migrations/20260715000002_rls.sql` — políticas de seguridad y reglas de negocio
3. `seed.sql` — configuración inicial y servicios

Opción CLI (recomendada a futuro):

```bash
npx supabase link --project-ref <ref-del-proyecto>
npx supabase db push
```

## Crear el primer admin y barbero

Los barberos y admins parten como usuarios normales registrados en la app.
Luego se promueven ejecutando los SQL comentados al final de `seed.sql`
(reemplazar los emails de ejemplo por los reales).

## Decisiones de diseño

- Timestamps en UTC (`timestamptz`); la UI convierte a `America/Santiago`.
- Doble reserva imposible a nivel de BD: constraint `EXCLUDE` con rango de
  tiempo por barbero, solo sobre citas `confirmada`.
- Ventanas de reserva/cancelación (`settings`) se validan también en un
  trigger de BD, no solo en la app.
- Los clientes no pueden cambiar su propio rol (policy en `profiles`).
