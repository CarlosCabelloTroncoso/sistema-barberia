import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata = { title: "Iniciar sesión" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Iniciar sesión</CardTitle>
          <CardDescription>Accede para gestionar tus reservas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <LoginForm next={next} />
          <p className="text-sm text-muted-foreground text-center">
            ¿No tienes cuenta?{" "}
            <Link href="/registro" className="underline underline-offset-4">
              Regístrate
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
