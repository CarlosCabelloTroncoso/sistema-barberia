import { formatInTimeZone } from "date-fns-tz";
import { es } from "date-fns/locale";

export const TIMEZONE = "America/Santiago";

const clpFormatter = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
});

export function formatCLP(amount: number): string {
  return clpFormatter.format(amount);
}

/** "martes 15 de julio, 14:30" en hora de Chile */
export function formatDateTime(iso: string | Date): string {
  return formatInTimeZone(iso, TIMEZONE, "EEEE d 'de' MMMM, HH:mm", {
    locale: es,
  });
}

export function formatDate(iso: string | Date): string {
  return formatInTimeZone(iso, TIMEZONE, "EEEE d 'de' MMMM", { locale: es });
}

export function formatTime(iso: string | Date): string {
  return formatInTimeZone(iso, TIMEZONE, "HH:mm");
}
