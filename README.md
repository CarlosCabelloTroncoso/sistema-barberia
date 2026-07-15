# Sistema Barbería

Sistema web de reservas para barbería, orientado al mercado chileno (CLP, zona horaria America/Santiago, interfaz en español).

Los clientes agendan citas con un barbero específico; los barberos gestionan su agenda y disponibilidad con notificaciones en tiempo real; los administradores gestionan servicios, precios y configuración.

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Tailwind CSS** + shadcn/ui
- **Supabase** — PostgreSQL, Auth, Realtime
- **Resend** — emails de confirmación y recordatorios
- **Vercel** — hosting y cron jobs

## Desarrollo

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Variables de entorno

Copia `.env.example` a `.env.local` y completa:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
```
