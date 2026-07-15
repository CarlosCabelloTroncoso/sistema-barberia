import { addMinutes, isBefore } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { TIMEZONE } from "./format";
import type { Availability } from "./types";

export interface BusyRange {
  starts_at: string;
  ends_at: string;
}

export interface ComputeSlotsInput {
  /** Día civil en hora de Chile, formato "YYYY-MM-DD" */
  date: string;
  durationMinutes: number;
  /** Ventanas de disponibilidad del barbero para el weekday de `date` */
  availability: Pick<Availability, "start_time" | "end_time">[];
  /** Citas confirmadas y bloqueos que tocan ese día (UTC) */
  busy: BusyRange[];
  slotIntervalMinutes: number;
  minBookingNoticeHours: number;
  now?: Date;
}

/** Weekday (0=domingo) de un día civil, independiente de zona horaria. */
export function weekdayOf(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/**
 * Calcula los inicios de cita disponibles (en UTC) para un barbero en un día.
 * Un slot es válido si cabe completo dentro de una ventana de disponibilidad,
 * no se solapa con citas/bloqueos y respeta el aviso mínimo.
 */
export function computeSlots({
  date,
  durationMinutes,
  availability,
  busy,
  slotIntervalMinutes,
  minBookingNoticeHours,
  now = new Date(),
}: ComputeSlotsInput): Date[] {
  const minStart = addMinutes(now, minBookingNoticeHours * 60);
  const busyRanges = busy.map((b) => ({
    start: new Date(b.starts_at),
    end: new Date(b.ends_at),
  }));

  const slots: Date[] = [];

  for (const window of availability) {
    const windowStart = fromZonedTime(`${date}T${window.start_time}`, TIMEZONE);
    const windowEnd = fromZonedTime(`${date}T${window.end_time}`, TIMEZONE);

    for (
      let start = windowStart;
      !isBefore(windowEnd, addMinutes(start, durationMinutes));
      start = addMinutes(start, slotIntervalMinutes)
    ) {
      const end = addMinutes(start, durationMinutes);
      if (isBefore(start, minStart)) continue;
      if (busyRanges.some((b) => start < b.end && b.start < end)) continue;
      slots.push(start);
    }
  }

  return slots.sort((a, b) => a.getTime() - b.getTime());
}
