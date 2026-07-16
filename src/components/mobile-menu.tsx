"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";

type MenuLink = { href: string; label: string };

export function MobileMenu({
  links,
  isLoggedIn,
  logoutAction,
}: {
  links: MenuLink[];
  isLoggedIn: boolean;
  logoutAction: () => void;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setOpen(false);

  // Respaldo: cierra si la ruta cambia por otra vía (atrás/adelante del
  // navegador). El cierre principal va directo en cada onClick de abajo,
  // no depende de este efecto (evita quedar abierto si el cambio de ruta
  // tarda o el layout persiste entre navegaciones).
  useEffect(() => {
    close();
  }, [pathname]);

  // Bloquea el scroll de fondo y permite cerrar con Escape mientras está abierto.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const itemCls =
    "rounded-2xl px-5 py-4 text-xl font-medium text-ink-2 transition-colors duration-150 hover:bg-white/[0.06] hover:text-foreground active:scale-[0.98]";

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-label={open ? "Cerrar menú" : "Abrir menú"}
        onClick={() => setOpen((v) => !v)}
        className="relative z-[70] flex size-9 shrink-0 items-center justify-center rounded-full border border-line-2 text-foreground transition-colors duration-150 hover:bg-white/[0.04] md:hidden"
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className={open ? "hidden" : "block"}
        >
          <path
            d="M4 7h16M4 12h16M4 17h16"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className={open ? "block" : "hidden"}
        >
          <path
            d="M6 6l12 12M18 6L6 18"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
          />
        </svg>
      </button>

      {open &&
        createPortal(
          // Portal a <body>: el overlay NO puede vivir dentro de .glass-nav.
          // Un backdrop-filter/filter en un ancestro crea un containing block
          // nuevo para descendientes `position: fixed` (spec CSS, Safari/iOS
          // lo aplica estricto) — el overlay quedaba encogido al alto del
          // pill del navbar en vez de cubrir la pantalla completa.
          <div
            className="fixed inset-0 z-[60] flex flex-col bg-background/98 backdrop-blur-xl duration-200 animate-in fade-in md:hidden motion-reduce:animate-none"
            role="dialog"
            aria-modal="true"
            onClick={close}
          >
            <div className="h-[calc(clamp(12px,2.4vw,22px)+56px)] shrink-0" aria-hidden />
            {/* onClick en cada link/botón: cierra en el mismo tap que navega,
                sin depender de que el efecto de pathname llegue a tiempo.
                El div de arriba cierra igual al tocar cualquier espacio
                vacío (backdrop), ya que el clic burbujea hasta él. */}
            <nav className="flex flex-1 flex-col items-stretch justify-center gap-1.5 px-6 pb-24">
              {links.map((l) => (
                <Link key={l.href} href={l.href} onClick={close} className={itemCls}>
                  {l.label}
                </Link>
              ))}
              {isLoggedIn ? (
                <form action={logoutAction}>
                  <button
                    type="submit"
                    onClick={close}
                    className={`w-full text-left ${itemCls}`}
                  >
                    Salir
                  </button>
                </form>
              ) : (
                <Link href="/login" onClick={close} className={itemCls}>
                  Iniciar sesión
                </Link>
              )}
            </nav>
          </div>,
          document.body
        )}
    </>
  );
}
