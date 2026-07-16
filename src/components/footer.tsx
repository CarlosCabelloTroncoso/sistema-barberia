import Link from "next/link";

const links = [
  { href: "/reservar", label: "Reservar hora" },
  { href: "/cuenta", label: "Mis reservas" },
  { href: "/login", label: "Iniciar sesión" },
  { href: "/registro", label: "Crear cuenta" },
];

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-[1240px] flex-col items-center gap-6 px-[clamp(20px,4vw,40px)] py-14 text-center sm:py-16">
        <p className="text-xl font-semibold tracking-tight">
          💈 Barber Rusiosky
        </p>
        <p className="max-w-sm text-sm text-balance text-muted-foreground">
          Barbería en Maule. Agenda online y confirmación al instante.
        </p>

        <nav
          aria-label="Enlaces del sitio"
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 text-sm"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-muted-foreground transition-colors duration-150 hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="border-t">
        <div className="mx-auto flex w-full max-w-[1240px] flex-col items-center gap-2 px-[clamp(20px,4vw,40px)] py-5 text-center text-xs text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <span>© {new Date().getFullYear()} Barber Rusiosky · Maule</span>
          <span className="font-mono">Lun a Sáb · agenda online</span>
        </div>
      </div>
    </footer>
  );
}
