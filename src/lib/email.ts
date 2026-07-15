import "server-only";

import { Resend } from "resend";
import { formatCLP, formatDateTime } from "./format";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "Barber Rusiosky <onboarding@resend.dev>";

export interface AppointmentEmailData {
  to: string;
  clientName: string;
  serviceName: string;
  barberName: string;
  startsAt: string;
  priceClp: number;
}

function layout(title: string, body: string): string {
  return `
  <div style="font-family: system-ui, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
    <h1 style="font-size: 20px;">💈 Barber Rusiosky</h1>
    <h2 style="font-size: 17px;">${title}</h2>
    ${body}
    <p style="color:#666; font-size: 13px; margin-top: 24px;">
      Puedes gestionar tus reservas en tu cuenta. Este es un correo automático.
    </p>
  </div>`;
}

function detailTable(d: AppointmentEmailData): string {
  return `
  <table style="font-size: 15px; border-collapse: collapse;">
    <tr><td style="padding: 4px 12px 4px 0; color:#666;">Servicio</td><td>${d.serviceName}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color:#666;">Barbero</td><td>${d.barberName}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color:#666;">Fecha</td><td style="text-transform: capitalize;">${formatDateTime(d.startsAt)}</td></tr>
    <tr><td style="padding: 4px 12px 4px 0; color:#666;">Precio</td><td>${formatCLP(d.priceClp)} (se paga en el local)</td></tr>
  </table>`;
}

/** Envía sin lanzar: un fallo de email nunca debe romper una reserva. */
async function safeSend(to: string, subject: string, html: string): Promise<void> {
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) console.error("[email] fallo al enviar:", subject, error.message);
  } catch (e) {
    console.error("[email] excepción al enviar:", subject, e);
  }
}

export async function sendConfirmationEmail(d: AppointmentEmailData): Promise<void> {
  await safeSend(
    d.to,
    "Reserva confirmada ✂️",
    layout(
      `Hola ${d.clientName}, tu reserva está confirmada`,
      detailTable(d)
    )
  );
}

export async function sendCancellationEmail(d: AppointmentEmailData): Promise<void> {
  await safeSend(
    d.to,
    "Reserva cancelada",
    layout(
      `Hola ${d.clientName}, tu reserva fue cancelada`,
      `${detailTable(d)}
       <p style="font-size: 15px;">Si no fuiste tú o quieres otra hora, agenda de nuevo en la app.</p>`
    )
  );
}

export async function sendRescheduleEmail(d: AppointmentEmailData): Promise<void> {
  await safeSend(
    d.to,
    "Reserva reprogramada 🔁",
    layout(`Hola ${d.clientName}, tu reserva cambió de hora`, detailTable(d))
  );
}

export async function sendReminderEmail(d: AppointmentEmailData): Promise<void> {
  await safeSend(
    d.to,
    "Recordatorio: tienes hora mañana ⏰",
    layout(`Hola ${d.clientName}, te esperamos`, detailTable(d))
  );
}
