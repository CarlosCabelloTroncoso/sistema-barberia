import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/actions";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = profile?.role ?? null;
  }

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <nav className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-1 px-4 py-2">
        <Link href="/" className="mr-2 font-bold tracking-tight">
          💈 Barber Rusiosky
        </Link>

        <div className="ml-auto flex flex-wrap items-center gap-1">
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/reservar" />}>
            Reservar
          </Button>

          {user && (
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/cuenta" />}>
              Mi cuenta
            </Button>
          )}

          {(role === "barbero" || role === "admin") && (
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/barbero" />}>
              Panel barbero
            </Button>
          )}

          {role === "admin" && (
            <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/admin" />}>
              Administración
            </Button>
          )}

          {user ? (
            <form action={logout}>
              <Button variant="outline" size="sm" type="submit">
                Salir
              </Button>
            </form>
          ) : (
            <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/login" />}>
              Iniciar sesión
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}
