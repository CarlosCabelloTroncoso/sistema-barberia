import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/(auth)/actions";
import { MobileMenu } from "@/components/mobile-menu";

type MenuLink = { href: string; label: string };

const arrow = (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
    <path
      d="M2 6h8M6.5 2.5 10 6l-3.5 3.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

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

  const links: MenuLink[] = [];
  if (user) links.push({ href: "/cuenta", label: "Mi cuenta" });
  if (role === "barbero" || role === "admin")
    links.push({ href: "/barbero", label: "Panel barbero" });
  if (role === "admin")
    links.push({ href: "/admin", label: "Administración" });

  const linkCls =
    "rounded-full px-3 py-2 text-sm text-ink-3 transition-colors duration-150 hover:bg-white/[0.04] hover:text-foreground";

  const authInline = user ? (
    <form action={logout}>
      <button type="submit" className={linkCls}>
        Salir
      </button>
    </form>
  ) : (
    <Link href="/login" className={linkCls}>
      Iniciar sesión
    </Link>
  );

  return (
    <header className="sticky top-[clamp(12px,2.4vw,22px)] z-50 flex justify-center px-3 pt-[clamp(12px,2.4vw,22px)]">
      <nav className="glass-nav relative flex w-full min-w-0 max-w-[1080px] flex-nowrap items-center gap-1.5 py-2 pl-4 pr-2 sm:gap-2">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-2 text-[15px] font-semibold tracking-tight"
        >
          <span aria-hidden className="text-lg">
            💈
          </span>
          <span className="hidden xs:inline">Barber Rusiosky</span>
        </Link>

        <span className="flex-1" />

        {/* Links + auth: inline en desktop (≥ md) */}
        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={linkCls}>
              {l.label}
            </Link>
          ))}
          {authInline}
        </div>

        <Link
          href="/reservar"
          prefetch
          className="cta-pill shrink-0 py-2 pl-4 pr-2 text-sm"
        >
          <span className="hidden xs:inline">Reservar hora</span>
          <span className="xs:hidden">Reservar</span>
          <span className="nub size-[26px]">{arrow}</span>
        </Link>

        {/* Menú móvil/tablet (< md): overlay de pantalla completa */}
        <MobileMenu links={links} isLoggedIn={!!user} logoutAction={logout} />
      </nav>
    </header>
  );
}
