import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./(auth)/actions";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Barber Rusiosky</h1>
      <p className="max-w-md text-muted-foreground">
        Agenda tu corte con tu barbero favorito. Rápido, sin llamadas.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button size="lg" nativeButton={false} render={<Link href="/reservar" />}>
          Reservar hora
        </Button>
        {user ? (
          <>
            <Button variant="outline" size="lg" nativeButton={false} render={<Link href="/cuenta" />}>
              Mi cuenta
            </Button>
            <form action={logout}>
              <Button variant="ghost" size="lg" type="submit">
                Cerrar sesión
              </Button>
            </form>
          </>
        ) : (
          <Button variant="outline" size="lg" nativeButton={false} render={<Link href="/login" />}>
            Iniciar sesión
          </Button>
        )}
      </div>
    </main>
  );
}
