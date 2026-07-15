import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight">Barber Rusiosky</h1>
      <p className="max-w-md text-muted-foreground">
        Agenda tu corte con tu barbero favorito. Rápido, sin llamadas.
      </p>
      <Button size="lg" nativeButton={false} render={<Link href="/reservar" />}>
        Reservar hora
      </Button>
    </main>
  );
}
