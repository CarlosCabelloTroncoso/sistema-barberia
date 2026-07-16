import Link from "next/link";
import { GalleryCarousel, type GallerySlide } from "@/components/gallery-carousel";
import { formatCLP } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Service } from "@/lib/types";

// Fotos placeholder (Unsplash, verificadas). Para el piloto real: subir fotos
// propias a /public/cortes y reemplazar estas URLs por "/cortes/mi-foto.jpg".
const cortes: GallerySlide[] = [
  {
    src: "https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=900&q=75",
    alt: "Barbero marcando un degradado con navaja",
    label: "Fade con detalle a navaja",
  },
  {
    src: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=900&q=75",
    alt: "Corte de pelo con tijera visto desde arriba",
    label: "Tijera y textura",
  },
  {
    src: "https://images.unsplash.com/photo-1493256338651-d82f7acb2b38?w=900&q=75",
    alt: "Degradado a máquina en la nuca",
    label: "Degradado a máquina",
  },
  {
    src: "https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=900&q=75",
    alt: "Barbero peinando y secando a un cliente",
    label: "Styling de acabado",
  },
  {
    src: "https://images.unsplash.com/photo-1517832606299-7ae9b720a186?w=900&q=75",
    alt: "Perfilado de barba con tijera en blanco y negro",
    label: "Barba clásica",
  },
  {
    src: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=900&q=75",
    alt: "Afeitado a navaja con el cliente reclinado",
    label: "Toalla caliente y navaja",
  },
];

const arrow = (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
    <path
      d="M2 6h8M6.5 2.5 10 6l-3.5 3.5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default async function Home() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("price_clp");
  const services = (data ?? []) as Service[];

  const minPrice = services[0]?.price_clp;
  const minDuration = services.length
    ? Math.min(...services.map((s) => s.duration_minutes))
    : null;

  return (
    <main className="flex-1">
      {/* Hero */}
      <section className="relative mx-auto w-full max-w-[1240px] px-[clamp(20px,4vw,40px)] pb-[clamp(80px,10vh,140px)] pt-[clamp(110px,16vh,170px)]">
        <div className="animate-rise" style={{ animationDelay: "0ms" }}>
          <span className="eyebrow-pill">
            <span className="dot" aria-hidden />
            Agenda abierta · Santiago de Chile
          </span>
        </div>
        <h1
          className="animate-rise mt-6 text-[clamp(46px,9.4vw,120px)] font-semibold leading-[0.94] tracking-[-0.03em]"
          style={{ animationDelay: "90ms" }}
        >
          Tu corte,
          <br />
          <span className="headline-accent">a tu hora.</span>
        </h1>
        <p
          className="animate-rise mt-7 max-w-[60ch] text-[clamp(17px,1.6vw,21px)] leading-[1.55] text-ink-3"
          style={{ animationDelay: "200ms" }}
        >
          Elige <strong className="font-medium text-foreground">barbero</strong>
          , <strong className="font-medium text-foreground">día</strong> y{" "}
          <strong className="font-medium text-foreground">hora</strong> en menos
          de un minuto. Sin llamadas, sin filas.
        </p>
        <div
          className="animate-rise mt-9 flex flex-wrap items-center gap-3"
          style={{ animationDelay: "310ms" }}
        >
          <Link
            href="/reservar"
            className="cta-pill py-[11px] pl-[22px] pr-3 text-[15px]"
          >
            Reservar hora
            <span className="nub size-[30px]">{arrow}</span>
          </Link>
          <Link
            href="#servicios"
            className="ghost-pill px-[22px] py-[11px] text-[15px]"
          >
            Ver la carta
          </Link>
        </div>

        {/* Línea de datos reales */}
        <dl className="mt-14 flex flex-wrap items-baseline gap-x-[clamp(28px,6vw,80px)] gap-y-6 border-t pt-6 font-mono text-[13px] text-ink-3">
          <div className="flex flex-col gap-1.5">
            <dt className="order-2 text-[11px] uppercase tracking-[0.06em] text-ink-4">
              Servicios
            </dt>
            <dd className="order-1 font-sans text-[22px] font-medium tabular-nums tracking-tight text-foreground">
              {services.length || "—"}
            </dd>
          </div>
          <div className="flex flex-col gap-1.5">
            <dt className="order-2 text-[11px] uppercase tracking-[0.06em] text-ink-4">
              Desde
            </dt>
            <dd className="order-1 font-sans text-[22px] font-medium tabular-nums tracking-tight text-foreground">
              {minPrice ? formatCLP(minPrice) : "—"}
            </dd>
          </div>
          <div className="flex flex-col gap-1.5">
            <dt className="order-2 text-[11px] uppercase tracking-[0.06em] text-ink-4">
              Corte más rápido
            </dt>
            <dd className="order-1 font-sans text-[22px] font-medium tabular-nums tracking-tight text-foreground">
              {minDuration ? `${minDuration} min` : "—"}
            </dd>
          </div>
          <div className="flex flex-col gap-1.5">
            <dt className="order-2 text-[11px] uppercase tracking-[0.06em] text-ink-4">
              Reserva online
            </dt>
            <dd className="order-1 font-sans text-[22px] font-medium tracking-tight text-foreground">
              24/7
            </dd>
          </div>
        </dl>
      </section>

      {/* Galería de cortes */}
      <section className="overflow-hidden py-[clamp(64px,8vh,104px)]">
        <div className="mx-auto mb-[clamp(36px,5vw,64px)] flex w-full max-w-[1240px] flex-wrap items-end justify-between gap-6 px-[clamp(20px,4vw,40px)]">
          <div>
            <p className="kicker mb-3.5">Galería</p>
            <h2 className="max-w-[22ch] text-[clamp(30px,4.4vw,56px)] font-medium leading-[1.02] tracking-[-0.035em]">
              El trabajo <em className="font-bold">habla.</em>
            </h2>
          </div>
          <p className="max-w-[38ch] text-[15px] leading-[1.55] text-ink-3">
            Cada corte sale de esta silla. Mira el estilo y reserva el tuyo.
          </p>
        </div>
        <GalleryCarousel slides={cortes} />
      </section>

      {/* Servicios: la carta */}
      <section
        id="servicios"
        className="mx-auto w-full max-w-[1240px] scroll-mt-24 px-[clamp(20px,4vw,40px)] py-[clamp(64px,8vh,104px)]"
      >
        <div className="mb-[clamp(36px,5vw,64px)]">
          <p className="kicker mb-3.5">Servicios</p>
          <h2 className="text-[clamp(30px,4.4vw,56px)] font-medium leading-[1.02] tracking-[-0.035em]">
            La carta
          </h2>
        </div>
        <ul className="grid gap-3.5 sm:grid-cols-2">
          {services.map((s) => (
            <li key={s.id}>
              <Link
                href="/reservar"
                className="glass-card group flex h-full flex-col justify-between gap-6 p-[clamp(20px,2.4vw,30px)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-medium tracking-tight">
                      {s.name}
                    </h3>
                    <p className="mt-1.5 max-w-[36ch] text-sm leading-[1.5] text-ink-3">
                      {s.description}
                    </p>
                  </div>
                  <span className="rounded-full border border-input bg-white/[0.02] px-2.5 py-1 font-mono text-[11px] tracking-[0.04em] text-ink-3">
                    {s.duration_minutes} min
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xl tabular-nums">
                    {formatCLP(s.price_clp)}
                  </span>
                  <span
                    aria-hidden
                    className="text-ink-4 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-foreground"
                  >
                    {arrow}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Cierre */}
      <section className="mx-auto w-full max-w-[1240px] px-[clamp(20px,4vw,40px)] pb-[clamp(88px,12vh,144px)] pt-[clamp(40px,6vh,72px)]">
        <div className="glass-card flex flex-col items-start gap-7 p-[clamp(28px,4vw,56px)] sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-[clamp(28px,3.6vw,44px)] font-medium leading-[1.05] tracking-[-0.03em]">
            Tu barbero <span className="headline-accent">te espera.</span>
          </h2>
          <Link
            href="/reservar"
            className="cta-pill shrink-0 py-[11px] pl-[22px] pr-3 text-[15px]"
          >
            Reservar hora
            <span className="nub size-[30px]">{arrow}</span>
          </Link>
        </div>
      </section>
    </main>
  );
}
