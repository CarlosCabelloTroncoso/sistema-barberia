import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col gap-8 px-[clamp(20px,4vw,40px)] py-12 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xl font-semibold tracking-tight">
            💈 Barber Rusiosky
          </p>
          <p className="mt-2 max-w-xs text-sm text-muted-foreground">
            Barbería en Santiago de Chile. Agenda online, confirmación al
            instante.
          </p>
        </div>

        <nav aria-label="Enlaces del sitio" className="flex gap-10 text-sm">
          <ul className="space-y-2">
            <li>
              <Link
                href="/reservar"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                Reservar hora
              </Link>
            </li>
            <li>
              <Link
                href="/cuenta"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                Mis reservas
              </Link>
            </li>
          </ul>
          <ul className="space-y-2">
            <li>
              <Link
                href="/login"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                Iniciar sesión
              </Link>
            </li>
            <li>
              <Link
                href="/registro"
                className="text-muted-foreground transition-colors hover:text-primary"
              >
                Crear cuenta
              </Link>
            </li>
          </ul>
        </nav>
      </div>

      <div className="border-t">
        <div className="mx-auto flex w-full max-w-[1240px] flex-wrap items-center justify-between gap-2 px-[clamp(20px,4vw,40px)] py-4 text-xs text-muted-foreground">
          <span>
            © {new Date().getFullYear()} Barber Rusiosky · Santiago de Chile
          </span>
          <span className="font-mono">Lun a Sáb · agenda online</span>
        </div>
      </div>
    </footer>
  );
}
